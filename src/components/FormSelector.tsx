import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface ChatbotForm {
  id: string;
  form_name: string;
  form_title: string;
  form_description: string | null;
  trigger_keywords: string[];
  is_active: boolean;
}

interface FormSelectorProps {
  chatbotId: string;
}

export function FormSelector({ chatbotId }: FormSelectorProps) {
  const [forms, setForms] = useState<ChatbotForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatbotId) {
      fetchForms();
    }
  }, [chatbotId]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbot_forms")
        .select("*")
        .eq("chatbot_id", chatbotId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error("Error fetching forms:", error);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("chatbot_forms")
        .update({ is_active: !currentStatus })
        .eq("id", formId);

      if (error) throw error;
      
      setForms(forms.map(form => 
        form.id === formId 
          ? { ...form, is_active: !currentStatus }
          : form
      ));
      
      toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling form status:", error);
      toast.error("Failed to update form status");
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("chatbot_forms")
        .delete()
        .eq("id", formId);

      if (error) throw error;
      
      setForms(forms.filter(form => form.id !== formId));
      toast.success("Form deleted successfully");
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  if (loading) {
    return <div>Loading forms...</div>;
  }

  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            No forms created yet. Go to the Forms section to create forms for this chatbot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Manage which forms are active for this chatbot. Active forms will be triggered when users mention the associated keywords.
      </div>
      
      {forms.map((form) => (
        <Card key={form.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={() => toggleFormStatus(form.id, form.is_active)}
                />
                <div>
                  <CardTitle className="text-sm">{form.form_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{form.form_title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={form.is_active ? "default" : "secondary"}>
                  {form.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteForm(form.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {form.form_description && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{form.form_description}</p>
            </CardContent>
          )}
          
          {form.trigger_keywords && form.trigger_keywords.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-2">Keywords:</span>
                {form.trigger_keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}