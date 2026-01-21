import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ChatbotForms } from "@/components/ChatbotForms";
import { FormSubmissions } from "@/components/FormSubmissions";
import { toast } from "sonner";

interface Chatbot {
  id: string;
  name: string;
}

export default function Forms() {
  const { user } = useAuth();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChatbots();
    }
  }, [user]);

  const fetchChatbots = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbots")
        .select("id, name")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setChatbots(data || []);
      // Don't auto-select to prevent wrong chatbot assignment
      setSelectedChatbotId("");
    } catch (error) {
      console.error("Error fetching chatbots:", error);
      toast.error("Failed to load chatbots");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms & Submissions</h1>
          <p className="text-muted-foreground">Manage forms and view submissions for your chatbots</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select
            value={selectedChatbotId}
            onValueChange={setSelectedChatbotId}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a chatbot" />
            </SelectTrigger>
            <SelectContent>
              {chatbots.map((chatbot) => (
                <SelectItem key={chatbot.id} value={chatbot.id}>
                  {chatbot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {!selectedChatbotId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {chatbots.length === 0 
                  ? "No chatbots found. Create a chatbot first to manage forms."
                  : "Select a chatbot to manage its forms and view submissions."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="forms">
            <Card>
              <CardHeader>
                <CardTitle>Manage Forms</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatbotForms chatbotId={selectedChatbotId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Form Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <FormSubmissions chatbotId={selectedChatbotId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}