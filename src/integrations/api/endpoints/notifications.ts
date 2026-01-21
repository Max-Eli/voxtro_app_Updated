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

/**
 * Send ticket reply notification
 * Replaces: supabase.functions.invoke('send-ticket-reply-notification', ...)
 */
export async function sendTicketReplyNotification(data: {
  ticket_id: string;
  ticket_subject: string;
  customer_email: string;
  customer_name: string;
  reply_content: string;
  agent_name: string;
}) {
  return apiClient.post('/api/notifications/ticket-reply', data);
}

/**
 * Send admin ticket notification
 * Replaces: supabase.functions.invoke('send-admin-ticket-notification', ...)
 */
export async function sendAdminTicketNotification(data: {
  ticket_id: string;
  ticket_subject: string;
  customer_email: string;
  customer_name: string;
  admin_email: string;
  message_content: string;
}) {
  return apiClient.post('/api/notifications/admin-ticket', data);
}
