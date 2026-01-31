/**
 * Customer Portal Permissions API Endpoints
 */
import { apiClient } from '../client';
import { supabase } from '@/integrations/supabase/client';

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

export interface CrawlUrl {
  id: string;
  customer_id: string;
  assistant_id: string;
  url: string;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'paused';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  last_crawled_at?: string;
  last_crawl_status?: 'success' | 'failed' | 'pending';
  last_crawl_error?: string;
  crawl_count: number;
  created_at: string;
  updated_at: string;
  assistant_name?: string;
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
// Customer Crawl URL Endpoints (Using Supabase directly with RLS)
// ============================================================================

/**
 * Get customer's submitted crawl URLs
 */
export async function getMyCrawlUrls(): Promise<{ crawl_urls: CrawlUrl[] }> {
  const { data, error } = await supabase
    .from('customer_crawl_urls')
    .select(`
      *,
      voice_assistants!inner(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching crawl URLs:', error);
    throw new Error(error.message);
  }

  // Transform data to include assistant_name
  const crawlUrls = (data || []).map((item: any) => ({
    ...item,
    assistant_name: item.voice_assistants?.name,
  }));

  return { crawl_urls: crawlUrls };
}

/**
 * Submit a new crawl URL
 */
export async function submitCrawlUrl(data: {
  assistant_id: string;
  url: string;
  description?: string;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
}): Promise<{ crawl_url: CrawlUrl; message: string }> {
  // First get the customer ID for the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error('Not authenticated');
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('email', user.email)
    .single();

  if (customerError || !customer) {
    throw new Error('Customer not found');
  }

  const { data: crawlUrl, error } = await supabase
    .from('customer_crawl_urls')
    .insert({
      customer_id: customer.id,
      assistant_id: data.assistant_id,
      url: data.url,
      description: data.description,
      crawl_frequency: data.crawl_frequency,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting crawl URL:', error);
    throw new Error(error.message);
  }

  return { crawl_url: crawlUrl, message: 'URL submitted for review' };
}

/**
 * Update a pending crawl URL
 */
export async function updateCrawlUrl(
  crawlUrlId: string,
  data: { url?: string; description?: string; crawl_frequency?: 'daily' | 'weekly' | 'monthly' }
): Promise<{ crawl_url: CrawlUrl }> {
  const { data: crawlUrl, error } = await supabase
    .from('customer_crawl_urls')
    .update(data)
    .eq('id', crawlUrlId)
    .eq('status', 'pending') // Can only update pending URLs
    .select()
    .single();

  if (error) {
    console.error('Error updating crawl URL:', error);
    throw new Error(error.message);
  }

  return { crawl_url: crawlUrl };
}

/**
 * Delete a pending crawl URL
 */
export async function deleteCrawlUrl(
  crawlUrlId: string
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase
    .from('customer_crawl_urls')
    .delete()
    .eq('id', crawlUrlId)
    .eq('status', 'pending'); // Can only delete pending URLs (RLS also enforces this)

  if (error) {
    console.error('Error deleting crawl URL:', error);
    throw new Error(error.message);
  }

  return { success: true, message: 'URL deleted' };
}

// ============================================================================
// Business Owner Crawl URL Management (Using Supabase directly with RLS)
// ============================================================================

/**
 * Get pending crawl URLs for review (business owners see their assistants' URLs)
 */
export async function getPendingCrawlUrls(): Promise<{ crawl_urls: CrawlUrl[] }> {
  const { data, error } = await supabase
    .from('customer_crawl_urls')
    .select(`
      *,
      voice_assistants!inner(name),
      customers!inner(email, full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending crawl URLs:', error);
    throw new Error(error.message);
  }

  // Transform data to include assistant_name and customer info
  const crawlUrls = (data || []).map((item: any) => ({
    ...item,
    assistant_name: item.voice_assistants?.name,
    customers: item.customers,
  }));

  return { crawl_urls: crawlUrls };
}

/**
 * Review (approve/reject) a crawl URL
 */
export async function reviewCrawlUrl(
  crawlUrlId: string,
  action: 'approve' | 'reject' | 'pause' | 'activate',
  notes?: string
): Promise<{ success: boolean; action: string; message?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  let newStatus: string;
  switch (action) {
    case 'approve':
      newStatus = 'active';
      break;
    case 'reject':
      newStatus = 'rejected';
      break;
    case 'pause':
      newStatus = 'paused';
      break;
    case 'activate':
      newStatus = 'active';
      break;
    default:
      throw new Error('Invalid action');
  }

  const { error } = await supabase
    .from('customer_crawl_urls')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', crawlUrlId);

  if (error) {
    console.error('Error reviewing crawl URL:', error);
    throw new Error(error.message);
  }

  return {
    success: true,
    action,
    message: action === 'approve' ? 'URL approved and set to active' : `URL ${action}ed`,
  };
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

/**
 * Check if customer can contribute crawl URLs to a voice assistant
 */
export function canContributeCrawlUrl(
  permissions: AgentPermissions[],
  assistantId: string
): boolean {
  return hasPermission(permissions, 'voice', assistantId, 'contribute_crawl_url');
}
