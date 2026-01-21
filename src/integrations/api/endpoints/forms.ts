/**
 * Form Handling API Endpoints
 */
import { apiClient } from '../client';

/**
 * Submit form
 * Replaces: supabase.functions.invoke('form-submit', ...)
 */
export async function submitForm(data: {
  form_id: string;
  submitted_data: any;
  conversation_id?: string;
  visitor_id?: string;
}) {
  return apiClient.post('/api/forms/submit', data);
}
