/**
 * Chat API Endpoints
 * Replaces Supabase edge function calls with FastAPI endpoints
 */
import { apiClient } from '../client';

export interface ChatMessageRequest {
  chatbot_id: string;
  conversation_id?: string;
  visitor_id: string;
  message: string;
  preview_mode?: boolean;
}

export interface ChatMessageResponse {
  conversation_id: string;
  message: string;
  actions?: any[];
}

export interface WebsiteCrawlRequest {
  chatbot_id: string;
  url: string;
  max_pages?: number;
}

/**
 * Send chat message
 * Replaces: supabase.functions.invoke('chat', ...)
 */
export async function sendChatMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
  return apiClient.post('/api/chat/message', request);
}

/**
 * Crawl website for chatbot knowledge
 * Replaces: supabase.functions.invoke('crawl-website', ...)
 */
export async function crawlWebsite(request: WebsiteCrawlRequest) {
  return apiClient.post('/api/chat/crawl', request);
}
