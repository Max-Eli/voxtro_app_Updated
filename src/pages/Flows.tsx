import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Workflow, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FlowBuilder } from "@/components/FlowBuilder";

export default function Flows() {
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const { toast } = useToast();

  const { data: chatbots, isLoading: isLoadingChatbots } = useQuery({
    queryKey: ['chatbots'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('chatbots')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const selectedChatbot = chatbots?.find(c => c.id === selectedChatbotId);

  const handleCreateFlow = () => {
    if (!selectedChatbotId) {
      toast({
        title: "Select a chatbot",
        description: "Please select a chatbot first to create a flow.",
        variant: "destructive",
      });
      return;
    }
    
    setIsBuilderOpen(true);
  };

  if (isBuilderOpen && selectedChatbot) {
    return (
      <div className="container mx-auto p-6">
        <FlowBuilder
          chatbotId={selectedChatbot.id}
          chatbotName={selectedChatbot.name}
          onBack={() => setIsBuilderOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversation Flows</h1>
          <p className="text-muted-foreground mt-2">
            Create custom conversation flows for your chatbots
          </p>
        </div>
        <Button onClick={handleCreateFlow} disabled={!selectedChatbotId}>
          <Plus className="mr-2 h-4 w-4" />
          Create Flow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Select Chatbot
          </CardTitle>
          <CardDescription>
            Choose a chatbot to manage its conversation flows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedChatbotId} onValueChange={setSelectedChatbotId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a chatbot..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingChatbots ? (
                <SelectItem value="loading" disabled>Loading chatbots...</SelectItem>
              ) : chatbots && chatbots.length > 0 ? (
                chatbots.map((chatbot) => (
                  <SelectItem key={chatbot.id} value={chatbot.id}>
                    {chatbot.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No chatbots available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedChatbot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Flows for {selectedChatbot.name}
            </CardTitle>
            <CardDescription>
              Manage conversation flows for this chatbot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Workflow className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No flows yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Create your first conversation flow to guide users through custom interactions
              </p>
              <Button onClick={handleCreateFlow}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Flow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
