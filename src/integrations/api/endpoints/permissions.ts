/**
 * Customer Portal Permissions API Endpoints
 */
import { apiClient } from '../client';

// Types
export interface PermissionType {
  id: string;
  category: 'view' | 'edit' | 'content';
  name: string;
  description: string;
  agent_type: 'voice' | 'chatbot' | 'whatsapp' | 'all';
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  is_enabled: boolean;
}

export interface AgentPermissions {
  agent_type: 'voice' | 'chatbot' | 'whatsapp';
  agent_id: string;
  agent_name: string;
  assignment_id: string;
  permissions: Permission[];
}

export interface AssignmentPermission {
  permission_type_id: string;
  name: string;
  category: string;
  description: string;
  is_enabled: boolean;
  is_set: boolean;
}

export interface ContributedContent {
  id: string;
  customer_id: string;
  assistant_id?: string;
  chatbot_id?: string;
  content_type: 'faq' | 'knowledge' | 'instruction';
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  review_notes?: string;
  created_at: string;
  updated_at: string;
  agent_type?: string;
  agent_name?: string;
  customers?: {
    email: string;
    full_name: string;
  };
}

export interface CustomerAssignment {
  type: 'voice' | 'chatbot' | 'whatsapp';
  assignment_id: string;
  agent_id: string;
  agent_name: string;
  permissions: Array<{ permission_type_id: string; is_enabled: boolean }>;
}

// ============================================================================
// Business Owner Endpoints
// ============================================================================

/**
 * Get all permission types (for UI display)
 */
export async function getPermissionTypes(): Promise<{ types: PermissionType[] }> {
  return apiClient.get('/api/permissions/types');
}

/**
 * Get permissions for a specific assignment
 */
export async function getAssignmentPermissions(
  assignmentType: 'voice' | 'chatbot' | 'whatsapp',
  assignmentId: string
): Promise<{
  assignment: { id: string; type: string; customer: { email: string; full_name: string } };
  permissions: AssignmentPermission[];
}> {
  return apiClient.get(`/api/permissions/assignment/${assignmentType}/${assignmentId}`);
}

/**
 * Set permissions for a specific assignment
 */
export async function setAssignmentPermissions(
  assignmentType: 'voice' | 'chatbot' | 'whatsapp',
  assignmentId: string,
  permissions: Array<{ permission_type_id: string; is_enabled: boolean }>
): Promise<{ success: boolean; message: string }> {
  return apiClient.post(`/api/permissions/assignment/${assignmentType}/${assignmentId}`, {
    permissions,
  });
}

/**
 * Get pending content submissions for review
 */
export async function getPendingContent(
  agentType?: 'voice' | 'chatbot'
): Promise<{ content: ContributedContent[] }> {
  const query = agentType ? `?agent_type=${agentType}` : '';
  return apiClient.get(`/api/permissions/content/pending${query}`);
}

/**
 * Approve or reject customer content
 */
export async function reviewContent(
  contentId: string,
  action: 'approve' | 'reject',
  notes?: string
): Promise<{ success: boolean; action: string; message?: string }> {
  return apiClient.post(`/api/permissions/content/${contentId}/review`, {
    action,
    notes,
  });
}

/**
 * Get all assignments for a customer with their permissions
 */
export async function getCustomerAssignmentsWithPermissions(
  customerId: string
): Promise<{ assignments: CustomerAssignment[] }> {
  return apiClient.get(`/api/permissions/customers/${customerId}/assignments`);
}

// ============================================================================
// Customer Portal Endpoints
// ============================================================================

/**
 * Get customer's own permissions
 */
export async function getMyPermissions(): Promise<{ permissions: AgentPermissions[] }> {
  return apiClient.get('/api/customers/portal/permissions');
}

/**
 * Get customer's submitted content
 */
export async function getMySubmittedContent(): Promise<{ content: ContributedContent[] }> {
  return apiClient.get('/api/customers/portal/content');
}

/**
 * Submit content contribution (FAQ)
 */
export async function submitFAQ(data: {
  assistant_id?: string;
  chatbot_id?: string;
  question: string;
  answer: string;
}): Promise<{ content: ContributedContent; message: string }> {
  return apiClient.post('/api/customers/portal/content', {
    assistant_id: data.assistant_id,
    chatbot_id: data.chatbot_id,
    content_type: 'faq',
    title: data.question,
    content: data.answer,
  });
}

/**
 * Update pending content
 */
export async function updateSubmittedContent(
  contentId: string,
  data: { title?: string; content?: string }
): Promise<{ content: ContributedContent }> {
  return apiClient.patch(`/api/customers/portal/content/${contentId}`, data);
}

/**
 * Delete pending content
 */
export async function deleteSubmittedContent(
  contentId: string
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/api/customers/portal/content/${contentId}`);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if customer has a specific permission for an agent
 */
export function hasPermission(
  permissions: AgentPermissions[],
  agentType: 'voice' | 'chatbot' | 'whatsapp',
  agentId: string,
  permissionId: string
): boolean {
  const agentPerms = permissions.find(
    (p) => p.agent_type === agentType && p.agent_id === agentId
  );
  if (!agentPerms) return false;

  const perm = agentPerms.permissions.find((p) => p.id === permissionId);
  return perm?.is_enabled ?? false;
}

/**
 * Check if customer can contribute FAQs to a voice assistant
 */
export function canContributeFAQ(
  permissions: AgentPermissions[],
  assistantId: string
): boolean {
  return hasPermission(permissions, 'voice', assistantId, 'contribute_faq');
}

/**
 * Check if customer can view analytics for an agent
 */
export function canViewAnalytics(
  permissions: AgentPermissions[],
  agentType: 'voice' | 'chatbot' | 'whatsapp',
  agentId: string
): boolean {
  return hasPermission(permissions, agentType, agentId, 'view_analytics');
}

/**
 * Check if customer can view calls for a voice assistant
 */
export function canViewCalls(
  permissions: AgentPermissions[],
  assistantId: string
): boolean {
  return hasPermission(permissions, 'voice', assistantId, 'view_calls');
}

/**
 * Check if customer can view leads
 */
export function canViewLeads(
  permissions: AgentPermissions[],
  agentType: 'voice' | 'chatbot' | 'whatsapp',
  agentId: string
): boolean {
  return hasPermission(permissions, agentType, agentId, 'view_leads');
}
