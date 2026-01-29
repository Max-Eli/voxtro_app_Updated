import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateCustomerRequest {
  email: string;
  full_name: string;
  company_name?: string;
  password: string;
  assigned_chatbots?: string[];  // Made optional - customer can be created without chatbot assignment
  assigned_by: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Create customer with auth function called");

  try {
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody));
    
    const { 
      email, 
      full_name, 
      company_name, 
      password, 
      assigned_chatbots, 
      assigned_by 
    }: CreateCustomerRequest = requestBody;

    // Validate required fields (chatbot assignment is optional)
    if (!email || !full_name || !password) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name, and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("Using service role key (first 10 chars):", supabaseServiceKey.substring(0, 10) + "...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Creating customer in database...");
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      return new Response(
        JSON.stringify({ error: `Customer with email ${email} already exists` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create customer in database
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        email,
        full_name,
        company_name: company_name || null
      })
      .select()
      .single();

    if (customerError) {
      console.error("Customer creation error:", customerError);
      throw new Error(`Failed to create customer: ${customerError.message}`);
    }

    console.log("Customer created successfully:", customer.id);

    console.log("Creating auth user...");
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name,
        is_customer: true,
        customer_email: email
      },
      email_confirm: true // This will mark the email as confirmed
    });

    if (authError) {
      console.error('Auth user creation failed:', authError);
      
      // If auth user already exists, try to update their metadata instead
      if (authError.message?.includes('already been registered')) {
        console.log("Auth user exists, updating metadata...");
        try {
          // Get the existing user
          const { data: existingUsers } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000
          });
          
          const existingUser = existingUsers.users.find(u => u.email === email);
          
          if (existingUser) {
            // Update user metadata
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              {
                user_metadata: {
                  full_name,
                  is_customer: true,
                  customer_email: email
                }
              }
            );
            
            if (updateError) {
              throw new Error(`Failed to update existing auth user: ${updateError.message}`);
            }
            
            console.log("Auth user metadata updated successfully");
          } else {
            throw new Error(`Failed to find existing auth user: ${authError.message}`);
          }
        } catch (updateError: any) {
          throw new Error(`Failed to handle existing auth user: ${updateError.message}`);
        }
      } else {
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }
    } else {
      console.log("Auth user created successfully:", authUser.user?.id);
    }

    // Create chatbot assignments only if chatbots are provided
    if (assigned_chatbots && assigned_chatbots.length > 0) {
      console.log("Creating chatbot assignments...");
      const assignments = assigned_chatbots.map(chatbotId => ({
        customer_id: customer.id,
        chatbot_id: chatbotId,
        assigned_by
      }));

      const { error: assignmentError } = await supabase
        .from('customer_chatbot_assignments')
        .insert(assignments);

      if (assignmentError) {
        console.error("Assignment creation error:", assignmentError);
        throw new Error(`Failed to create assignments: ${assignmentError.message}`);
      }

      console.log("Assignments created successfully");
    } else {
      console.log("No chatbot assignments to create - customer created without chatbot");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer: customer,
        auth_created: !authError 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-customer-with-auth function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);