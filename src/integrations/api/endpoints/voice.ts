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
  return apiClient.post('/api/voice/validate-elevenlabs', { api_key: apiKey });
}
