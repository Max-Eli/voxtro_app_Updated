/**
 * WhatsApp Agent API Endpoints
 */
import { apiClient } from '../client';

/**
 * Validate ElevenLabs API key
 */
export async function validateElevenLabsApiKey(apiKey: string) {
  return apiClient.post(`/api/whatsapp/validate-elevenlabs?api_key=${encodeURIComponent(apiKey)}`);
}

/**
 * Sync WhatsApp agents from ElevenLabs
 * Replaces: supabase.functions.invoke('sync-whatsapp-agents', ...)
 */
export async function syncWhatsAppAgents() {
  return apiClient.post('/api/whatsapp/sync');
}

/**
 * Update WhatsApp agent
 * Replaces: supabase.functions.invoke('update-whatsapp-agent', ...)
 */
export async function updateWhatsAppAgent(agentId: string, updates: any) {
  return apiClient.patch(`/api/whatsapp/${agentId}`, updates);
}

/**
 * Get WhatsApp agent
 * Replaces: supabase.functions.invoke('get-whatsapp-agent', ...)
 */
export async function getWhatsAppAgent(agentId: string) {
  return apiClient.get(`/api/whatsapp/${agentId}`);
}

/**
 * Fetch conversations from ElevenLabs and sync to database
 * This fetches conversation details including transcripts
 */
export async function fetchWhatsAppConversations(agentId: string) {
  return apiClient.post(`/api/whatsapp/${agentId}/fetch-conversations`);
}
