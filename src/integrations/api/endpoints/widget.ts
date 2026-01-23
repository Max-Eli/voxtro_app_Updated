/**
 * Widget API Endpoints
 * For embeddable chatbot widgets
 */
import { apiClient } from '../client';

export interface WidgetConfig {
  chatbot_id: string;
  name: string;
  theme: any;
  first_message?: string;
  placeholder_text?: string;
  forms: any[];
  faqs: any[];
}

export interface WidgetMessageRequest {
  chatbot_id: string;
  visitor_id: string;
  message: string;
  conversation_id?: string;
}

/**
 * Get widget configuration (PUBLIC - no auth)
 */
export async function getWidgetConfig(chatbotId: string): Promise<WidgetConfig> {
  return apiClient.get(`/api/widget/${chatbotId}/config`);
}

/**
 * Send message from widget (PUBLIC - no auth)
 */
export async function sendWidgetMessage(chatbotId: string, request: WidgetMessageRequest) {
  return apiClient.post(`/api/widget/${chatbotId}/message`, request);
}

/**
 * End conversation and generate AI summary (PUBLIC - no auth)
 */
export async function endWidgetConversation(conversationId: string) {
  return apiClient.post(`/api/chat/conversations/${conversationId}/end`, {});
}
