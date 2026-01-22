/**
 * OpenAI Connection API Endpoints
 */
import { apiClient } from '../client';

/**
 * Connect OpenAI API key
 */
export async function connectOpenAI(apiKey: string) {
  return apiClient.post('/api/openai/connect', { api_key: apiKey });
}

/**
 * Validate stored OpenAI API key
 */
export async function validateOpenAI() {
  return apiClient.get('/api/openai/validate');
}

/**
 * Get OpenAI connection status
 */
export async function getOpenAIStatus() {
  return apiClient.get('/api/openai/status');
}
