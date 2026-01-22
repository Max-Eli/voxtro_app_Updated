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
  chatbot_id?: string;
}) {
  return apiClient.post('/api/customers', data);
}

/**
 * Create support ticket (admin)
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
export async function sendCustomerLoginLink(email: string) {
  return apiClient.post(`/api/customers/send-login-link?email=${encodeURIComponent(email)}`);
}

// ==================== Customer Portal Endpoints ====================

/**
 * Get customer's own profile (for logged in customers)
 */
export async function getCustomerPortalProfile() {
  return apiClient.get('/api/customers/portal/me');
}

/**
 * Get all agents/chatbots available to the customer
 */
export async function getCustomerPortalAgents() {
  return apiClient.get('/api/customers/portal/agents');
}

/**
 * Get customer's conversation history
 */
export async function getCustomerPortalConversations() {
  return apiClient.get('/api/customers/portal/conversations');
}

/**
 * Get messages for a specific conversation
 */
export async function getCustomerPortalConversationMessages(conversationId: string) {
  return apiClient.get(`/api/customers/portal/conversations/${conversationId}/messages`);
}

/**
 * Get customer's support tickets
 */
export async function getCustomerPortalTickets() {
  return apiClient.get('/api/customers/portal/tickets');
}

/**
 * Create support ticket (for customers)
 */
export async function createCustomerPortalTicket(data: {
  subject: string;
  description: string;
  priority: string;
}) {
  return apiClient.post('/api/customers/portal/tickets', data);
}

