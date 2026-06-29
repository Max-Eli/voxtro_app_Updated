/**
 * SMS Agents API client.
 *
 * Reads SMS conversation data through the Voxtro backend, which proxies
 * to the build.voxtro.io platform. Locally we only store the
 * customer ↔ sms_agent_id assignments — actual messages come from the
 * external system.
 */
import { apiClient } from '../client';

// ---- Types ----

export interface SmsAgentSummary {
  id: string;
  name: string;
}

export interface SmsMessage {
  id: string;
  sms_agent_id: string;
  agent_name: string;
  conversation_id: string | null;
  contact_number: string | null;
  twilio_number: string | null;
  direction: 'inbound' | 'outbound';
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
  tokens_used?: number;
  twilio_message_sid?: string | null;
}

export interface SmsMessagesResponse {
  messages: SmsMessage[];
  total: number;
  limit?: number;
  offset?: number;
  /** Only set by the customer-portal endpoint, not by the admin endpoint. */
  assigned_agents?: SmsAgentSummary[];
  /** Present when the SMS platform connection isn't configured / disabled. */
  error?: string;
}

export interface SmsPlatformAgent {
  id: string;
  name: string;
  is_active?: boolean;
  created_at?: string;
}

export interface SmsAgentAssignmentRow {
  id: string;
  sms_agent_id: string;
  agent_name: string | null;
  created_at: string;
}

// ---- API ----

export const smsAgentsApi = {
  /** Customer-facing: list SMS messages for the caller's assigned agents. */
  listMessages: (opts?: {
    agent_id?: string;
    direction?: 'inbound' | 'outbound';
    contact?: string;
    limit?: number;
    offset?: number;
  }): Promise<SmsMessagesResponse> => {
    const params = new URLSearchParams();
    if (opts?.agent_id) params.set('agent_id', opts.agent_id);
    if (opts?.direction) params.set('direction', opts.direction);
    if (opts?.contact) params.set('contact', opts.contact);
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return apiClient.get(`/api/customers/portal/sms-messages${qs ? `?${qs}` : ''}`);
  },

  /** Admin: list every SMS agent reachable through one of the caller's
   *  saved sms_connections. The admin picks the connection. */
  listPlatformAgents: (connectionId: string): Promise<{ agents: SmsPlatformAgent[]; error?: string }> =>
    apiClient.get(`/api/customers/sms-platform-agents?connection_id=${encodeURIComponent(connectionId)}`),

  /** Admin: list SMS messages from one of the caller's saved connections.
   *  Unlike the customer-portal endpoint this is NOT scoped to assignments —
   *  it returns logs for every agent in the org behind the connection. */
  listPlatformMessages: (opts: {
    connection_id: string;
    agent_id?: string;
    direction?: 'inbound' | 'outbound';
    contact?: string;
    limit?: number;
    offset?: number;
  }): Promise<SmsMessagesResponse> => {
    const p = new URLSearchParams({ connection_id: opts.connection_id });
    if (opts.agent_id) p.set('agent_id', opts.agent_id);
    if (opts.direction) p.set('direction', opts.direction);
    if (opts.contact) p.set('contact', opts.contact);
    if (opts.limit !== undefined) p.set('limit', String(opts.limit));
    if (opts.offset !== undefined) p.set('offset', String(opts.offset));
    return apiClient.get(`/api/customers/sms-platform-messages?${p.toString()}`);
  },

  /** Admin: get a customer's current SMS agent assignments. */
  getAssignments: (customerId: string): Promise<{ assignments: SmsAgentAssignmentRow[] }> =>
    apiClient.get(`/api/customers/${customerId}/sms-agents`),

  /** Admin: replace the full set of SMS agent assignments for a customer. */
  updateAssignments: (
    customerId: string,
    assignments: Array<{ sms_agent_id: string; agent_name?: string }>
  ): Promise<{ success: boolean; assignments: SmsAgentAssignmentRow[] }> =>
    apiClient.put(`/api/customers/${customerId}/sms-agents`, { assignments }),
};
