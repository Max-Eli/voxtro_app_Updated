import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketRequest {
  user_id?: string;
  subject: string;
  description: string;
  customer_name: string;
  customer_email: string;
  priority?: string;
  chatbot_id?: string;
  customer_id?: string;
}

const normalizePriority = (priority?: string): "low" | "medium" | "high" | "urgent" => {
  const v = (priority ?? "").toLowerCase().trim();

  if (!v) return "medium";
  if (v === "low" || v === "medium" || v === "high" || v === "urgent") return v;

  // Common synonyms from users/chatbots
  if (v === "moderate" || v === "normal" || v === "mid" || v === "average") return "medium";
  if (v === "critical" || v === "asap" || v === "immediate" || v === "emergency") return "urgent";

  // Default to a safe value that satisfies DB constraints
  return "medium";
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Creating support ticket...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rawBody = await req.json();
    console.log("Received ticket data:", JSON.stringify(rawBody, null, 2));

    // Handle nested parameters structure from chatbot tools
    const body: TicketRequest = rawBody?.parameters
      ? {
          ...rawBody.parameters,
          chatbot_id: rawBody._metadata?.chatbotId,
        }
      : rawBody;

    console.log("Parsed ticket data:", JSON.stringify(body, null, 2));

    // Resolve user_id (do NOT trust caller-supplied user_id if we can derive it from chatbot_id or customer_id)
    let resolvedUserId = body.user_id;

    // If chatbot_id is provided, get user_id from the chatbot owner
    if (body.chatbot_id) {
      const { data: chatbot, error: chatbotError } = await supabase
        .from("chatbots")
        .select("user_id")
        .eq("id", body.chatbot_id)
        .maybeSingle();

      if (chatbotError) {
        console.error("Error looking up chatbot owner:", chatbotError);
        return new Response(JSON.stringify({ error: "Failed to validate chatbot_id" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!chatbot) {
        console.error("Invalid chatbot_id (not found):", body.chatbot_id);
        return new Response(JSON.stringify({ error: "Invalid chatbot_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      resolvedUserId = chatbot.user_id;
    }

    // If customer_id is provided and we still don't have a user_id, get it from customer's chatbot assignment
    if (!resolvedUserId && body.customer_id) {
      console.log("Resolving user_id from customer_id:", body.customer_id);
      
      // Get the admin user_id from the customer's chatbot assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("customer_chatbot_assignments")
        .select("assigned_by")
        .eq("customer_id", body.customer_id)
        .limit(1)
        .maybeSingle();

      if (assignmentError) {
        console.error("Error looking up customer assignment:", assignmentError);
      }

      if (assignment) {
        resolvedUserId = assignment.assigned_by;
        console.log("Resolved user_id from chatbot assignment:", resolvedUserId);
      } else {
        // Try voice assistant assignments
        const { data: voiceAssignment, error: voiceError } = await supabase
          .from("customer_assistant_assignments")
          .select("assigned_by")
          .eq("customer_id", body.customer_id)
          .limit(1)
          .maybeSingle();

        if (voiceError) {
          console.error("Error looking up voice assistant assignment:", voiceError);
        }

        if (voiceAssignment) {
          resolvedUserId = voiceAssignment.assigned_by;
          console.log("Resolved user_id from voice assignment:", resolvedUserId);
        } else {
          // Try WhatsApp agent assignments
          const { data: whatsappAssignment, error: whatsappError } = await supabase
            .from("customer_whatsapp_agent_assignments")
            .select("assigned_by")
            .eq("customer_id", body.customer_id)
            .limit(1)
            .maybeSingle();

          if (whatsappError) {
            console.error("Error looking up WhatsApp assignment:", whatsappError);
          }

          if (whatsappAssignment) {
            resolvedUserId = whatsappAssignment.assigned_by;
            console.log("Resolved user_id from WhatsApp assignment:", resolvedUserId);
          }
        }
      }
    }

    const normalizedPriority = normalizePriority(body.priority);

    // Validate required fields
    if (!resolvedUserId || !body.subject || !body.description || !body.customer_name || !body.customer_email) {
      console.error("Missing required fields:", {
        user_id: !!resolvedUserId,
        subject: !!body.subject,
        description: !!body.description,
        customer_name: !!body.customer_name,
        customer_email: !!body.customer_email,
      });

      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: subject, description, customer_name, customer_email (and either user_id or chatbot_id)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Resolved ticket owner user_id:", resolvedUserId);
    console.log("Normalized priority:", normalizedPriority);

    // Create the support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: resolvedUserId,
        subject: body.subject,
        description: body.description,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        priority: normalizedPriority,
        chatbot_id: body.chatbot_id || null,
        customer_id: body.customer_id || null,
        source: "chatbot",
        status: "open",
      })
      .select()
      .single();

    if (ticketError) {
      console.error("Error creating ticket:", ticketError);
      return new Response(JSON.stringify({ error: ticketError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Ticket created:", ticket.id);

    // Create the initial message from the customer
    const { error: messageError } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      content: body.description,
      sender_type: "customer",
      sender_name: body.customer_name,
    });

    if (messageError) {
      console.error("Error creating initial message:", messageError);
      // Don't fail the whole request, ticket is already created
    }

    console.log("Support ticket created successfully:", ticket.id);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: ticket.id,
        message: "Support ticket created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
