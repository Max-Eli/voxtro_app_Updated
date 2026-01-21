import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

interface ChatbotFAQsProps {
  chatbotId: string;
}

export function ChatbotFAQs({ chatbotId }: ChatbotFAQsProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (chatbotId) {
      fetchFAQs();
    }
  }, [chatbotId]);

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('sort_order');

      if (error) throw error;
      setFaqs(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch FAQs',
        variant: 'destructive',
      });
    }
  };

  const addFAQ = async () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;

    setLoading(true);
    try {
      const maxSortOrder = Math.max(...faqs.map(f => f.sort_order), -1);
      
      const { error } = await supabase
        .from('chatbot_faqs')
        .insert({
          chatbot_id: chatbotId,
          question: newFAQ.question.trim(),
          answer: newFAQ.answer.trim(),
          sort_order: maxSortOrder + 1,
        });

      if (error) throw error;

      setNewFAQ({ question: '', answer: '' });
      fetchFAQs();
      
      toast({
        title: 'Success',
        description: 'FAQ added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add FAQ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const { error } = await supabase
        .from('chatbot_faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;

      fetchFAQs();
      toast({
        title: 'Success',
        description: 'FAQ deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete FAQ',
        variant: 'destructive',
      });
    }
  };

  const toggleFAQActive = async (faqId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbot_faqs')
        .update({ is_active: isActive })
        .eq('id', faqId);

      if (error) throw error;

      fetchFAQs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update FAQ',
        variant: 'destructive',
      });
    }
  };

  const updateFAQ = async (faqId: string, field: 'question' | 'answer', value: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_faqs')
        .update({ [field]: value })
        .eq('id', faqId);

      if (error) throw error;

      fetchFAQs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update FAQ',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </CardTitle>
        <CardDescription>
          Create quick-send buttons for common questions that visitors can click to ask
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new FAQ */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <div>
            <Label htmlFor="new-question" className="text-sm font-medium">Question</Label>
            <Input
              id="new-question"
              placeholder="Enter a frequently asked question..."
              value={newFAQ.question}
              onChange={(e) => setNewFAQ(prev => ({ ...prev, question: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="new-answer" className="text-sm font-medium">Answer</Label>
            <Textarea
              id="new-answer"
              placeholder="Enter the answer the chatbot should give..."
              value={newFAQ.answer}
              onChange={(e) => setNewFAQ(prev => ({ ...prev, answer: e.target.value }))}
              rows={3}
            />
          </div>
          <Button 
            onClick={addFAQ} 
            disabled={loading || !newFAQ.question.trim() || !newFAQ.answer.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No FAQs yet. Add your first FAQ to get started!</p>
            </div>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={faq.is_active}
                      onCheckedChange={(checked) => toggleFAQActive(faq.id, checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {faq.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFAQ(faq.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Question</Label>
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                    placeholder="Enter the question visitors will see..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Answer</Label>
                  <Textarea
                    value={faq.answer || ''}
                    onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                    placeholder="Enter the answer the chatbot should give..."
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {faqs.length > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <strong>Tip:</strong> These questions will appear as clickable buttons in your chat widget, 
            making it easy for visitors to ask common questions. Only active FAQs will be shown.
          </div>
        )}
      </CardContent>
    </Card>
  );
}