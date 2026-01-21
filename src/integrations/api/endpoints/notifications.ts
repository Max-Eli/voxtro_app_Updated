/**
 * Notification API Endpoints
 */
import { apiClient } from '../client';

/**
 * Send email notification
 * Replaces: supabase.functions.invoke('basic-email', ...)
 */
export async function sendEmail(data: {
  to_email: string;
  subject: string;
  html_content: string;
  from_name?: string;
}) {
  return apiClient.post('/api/notifications/email', data);
}

/**
 * Send contact form
 * Replaces: supabase.functions.invoke('send-contact-form', ...)
 */
export async function sendContactForm(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return apiClient.post('/api/notifications/contact', data);
}
