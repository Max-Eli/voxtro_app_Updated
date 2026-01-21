/**
 * Customer Management API Endpoints
 */
import { apiClient } from '../client';

/**
 * Create customer with auth
 * Replaces: supabase.functions.invoke('create-customer-with-auth', ...)
 */
export async function createCustomerWithAuth(data: {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
}) {
  return apiClient.post('/api/customers', data);
}

/**
 * Create support ticket
 * Replaces: supabase.functions.invoke('create-support-ticket', ...)
 */
export async function createSupportTicket(data: {
  subject: string;
  description: string;
  priority: string;
  customer_id?: string;
}) {
  return apiClient.post('/api/customers/tickets', data);
}

/**
 * Send customer login link
 * Replaces: supabase.functions.invoke('send-customer-login-link', ...)
 */
export async function sendCustomerLoginLink(data: {
  email: string;
  full_name: string;
}) {
  return apiClient.post('/api/customers/send-login-link', data);
}

/**
 * Extract leads from customer conversations
 * Replaces: supabase.functions.invoke('extract-leads', ...)
 */
export async function extractLeads(data: {
  customerId: string;
}) {
  return apiClient.post('/api/customers/extract-leads', data);
}
