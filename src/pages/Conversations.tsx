import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import ConversationsList from "@/components/ConversationsList";
import ConversationDetail from "@/components/ConversationDetail";

const Conversations = () => {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleBack = () => {
    setSelectedConversationId(null);
  };

  if (!user) {
    return <div>Please log in to view conversations.</div>;
  }

  return (
    <div className="p-6">
      {!selectedConversationId && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Conversations</h1>
          <p className="text-muted-foreground">View all chat history between users and your chatbots</p>
        </div>
      )}

      <Card className="h-[calc(100vh-200px)]">
        {selectedConversationId ? (
          <ConversationDetail 
            conversationId={selectedConversationId} 
            onBack={handleBack}
          />
        ) : (
          <ConversationsList onConversationSelect={handleConversationSelect} />
        )}
      </Card>
    </div>
  );
};

export default Conversations;