/**
 * Voice Assistant API Endpoints
 */
import { apiClient } from '../client';

/**
 * Sync voice assistants from VAPI
 * Replaces: supabase.functions.invoke('sync-voice-assistants', ...)
 */
export async function syncVoiceAssistants() {
  return apiClient.post('/api/voice/sync');
}

/**
 * Update voice assistant
 * Replaces: supabase.functions.invoke('update-voice-assistant', ...)
 */
export async function updateVoiceAssistant(assistantId: string, updates: any) {
  return apiClient.patch(`/api/voice/${assistantId}`, updates);
}

/**
 * Validate voice connection
 * Replaces: supabase.functions.invoke('validate-voice-connection', ...)
 */
export async function validateVoiceConnection(apiKey: string, publicKey: string) {
  return apiClient.post('/api/voice/validate', {
    api_key: apiKey,
    public_key: publicKey || null
  });
}

/**
 * Get VAPI web token
 * Replaces: supabase.functions.invoke('get-vapi-web-token', ...)
 */
export async function getVapiWebToken() {
  return apiClient.get('/api/voice/token');
}

/**
 * Validate ElevenLabs connection
 * Replaces: supabase.functions.invoke('validate-elevenlabs-connection', ...)
 */
export async function validateElevenLabsConnection(apiKey: string) {
  // Send API key in request body for better handling of special characters
  return apiClient.post('/api/whatsapp/validate-elevenlabs', { api_key: apiKey });
}

/**
 * Fetch and sync calls from VAPI API for a specific assistant
 * Used by customer portal to get call history
 *
 * This endpoint searches through ALL VAPI connections for the user
 * to find the correct organization containing the assistant.
 */
export async function fetchVapiCalls(assistantId: string) {
  return apiClient.post<{
    success: boolean;
    total_from_vapi: number;
    synced_count: number;
    assistant_name: string | null;
    vapi_org_name: string | null;
    matched_vapi_id: string | null;
    total_all_calls: number | null;
    assistant_ids_in_vapi: string[] | null;
  }>('/api/voice/fetch-calls', { assistant_id: assistantId });
}
