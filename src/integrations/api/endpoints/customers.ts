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

/**
 * Get customer's leads from assigned agents
 */
export async function getCustomerPortalLeads(): Promise<{ leads: CustomerLead[] }> {
  return apiClient.get('/api/customers/portal/leads');
}

export interface CustomerLead {
  id: string;
  source_type: 'chatbot' | 'voice' | 'whatsapp';
  source_id: string;
  source_name: string | null;
  conversation_id: string;
  phone_number: string | null;
  email: string | null;
  name: string | null;
  additional_data: Record<string, string>;
  extracted_at: string;
}

/**
 * Get customer portal analytics/overview data
 */
export async function getCustomerPortalAnalytics(): Promise<CustomerAnalyticsResponse> {
  return apiClient.get('/api/customers/portal/analytics');
}

export interface CustomerAnalyticsResponse {
  chatbots: {
    assigned: Array<{
      id: string;
      name: string;
      description?: string;
      theme_color?: string;
      conversation_count: number;
      message_count: number;
    }>;
    total_conversations: number;
    total_messages: number;
    avg_messages_per_conversation: number;
  };
  voice_assistants: {
    assigned: Array<{
      id: string;
      name: string;
      first_message?: string;
      voice_provider?: string;
      phone_number?: string;
      call_count: number;
      total_duration: number;
    }>;
    total_calls: number;
    total_duration: number;
    avg_duration: number;
    success_rate: number;
  };
  whatsapp_agents: {
    assigned: Array<{
      id: string;
      name: string;
      phone_number?: string;
      status?: string;
      conversation_count: number;
    }>;
    total_conversations: number;
    total_messages: number;
  };
  leads: {
    recent: Array<{
      id: string;
      name: string | null;
      email: string | null;
      phone_number: string | null;
      source_type: string;
      source_name: string | null;
      extracted_at: string;
    }>;
    total_count: number;
    conversion_rates: {
      chatbot: number;
      voice: number;
      whatsapp: number;
      overall: number;
    };
  };
  support_tickets: {
    recent: Array<{
      id: string;
      subject: string;
      status: string;
      priority: string;
      created_at: string;
      updated_at: string;
    }>;
    open_count: number;
  };
}

/**
 * Sync WhatsApp conversations from ElevenLabs for customer's assigned agents
 * Call this when loading the WhatsApp agents page to get latest conversations
 */
export async function syncCustomerWhatsAppConversations() {
  return apiClient.post('/api/customers/portal/sync-whatsapp-conversations');
}

/**
 * Sync Voice Assistant calls from VAPI for customer's assigned assistants
 * Call this when loading the Voice Assistants page to get latest calls
 */
export async function syncCustomerVoiceCalls() {
  return apiClient.post('/api/customers/portal/sync-voice-calls');
}

// ==================== Conversation/Call Logs with Analysis ====================

export interface ChatbotConversationLog {
  id: string;
  chatbot_id: string;
  chatbot_name: string;
  created_at: string;
  updated_at: string;
  lead_info: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    interest_level?: string;
  } | null;
  summary: string | null;
  message_count: number;
  last_message: {
    content: string;
    role: string;
    created_at: string;
  } | null;
}

export interface VoiceCallLog {
  id: string;
  assistant_id: string;
  assistant_name: string;
  assistant_phone: string | null;
  caller_phone: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  analysis: {
    summary: string | null;
    key_points: string[] | null;
    action_items: string[] | null;
    sentiment: string | null;
    sentiment_notes: string | null;
    call_outcome: string | null;
    topics_discussed: string[] | null;
    lead_info: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      interest_level?: string;
    } | null;
  };
}

export interface WhatsAppConversationLog {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_phone: string | null;
  customer_phone: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  analysis: {
    summary: string | null;
    key_points: string[] | null;
    action_items: string[] | null;
    sentiment: string | null;
    sentiment_notes: string | null;
    conversation_outcome: string | null;
    topics_discussed: string[] | null;
    lead_info: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      interest_level?: string;
    } | null;
  };
}

/**
 * Get recent chatbot conversations with AI analysis
 */
export async function getCustomerChatbotConversations(): Promise<{ conversations: ChatbotConversationLog[] }> {
  return apiClient.get('/api/customers/portal/chatbot-conversations');
}

/**
 * Get recent voice calls with AI analysis
 */
export async function getCustomerVoiceCallLogs(): Promise<{ calls: VoiceCallLog[] }> {
  return apiClient.get('/api/customers/portal/voice-call-logs');
}

/**
 * Get recent WhatsApp conversations with AI analysis
 */
export async function getCustomerWhatsAppConversationLogs(): Promise<{ conversations: WhatsAppConversationLog[] }> {
  return apiClient.get('/api/customers/portal/whatsapp-conversation-logs');
}

