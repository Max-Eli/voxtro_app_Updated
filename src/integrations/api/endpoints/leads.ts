/**
 * Leads API Endpoints
 */
import { apiClient } from '../client';

export interface Lead {
  id: string;
  conversation_id: string;
  chatbot_id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  created_at: string;
}

/**
 * Extract leads from a conversation
 */
export async function extractLeadsFromConversation(conversationId: string) {
  return apiClient.post(`/api/leads/extract?conversation_id=${conversationId}`);
}

/**
 * Extract leads from multiple conversations (batch)
 */
export async function extractLeadsBatch(chatbotId: string, limit: number = 50) {
  return apiClient.post(`/api/leads/extract-batch?chatbot_id=${chatbotId}&limit=${limit}`);
}

/**
 * Get all leads
 */
export async function getLeads(chatbotId?: string, limit: number = 100): Promise<{ leads: Lead[] }> {
  const params = new URLSearchParams();
  if (chatbotId) params.append('chatbot_id', chatbotId);
  params.append('limit', limit.toString());
  return apiClient.get(`/api/leads?${params.toString()}`);
}
