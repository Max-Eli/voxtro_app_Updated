import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getMyPermissions, AgentPermissions, hasPermission } from '@/integrations/api/endpoints/permissions';
import { useCustomerAuth } from './useCustomerAuth';

interface CustomerPermissionsContextType {
  permissions: AgentPermissions[];
  loading: boolean;
  error: string | null;
  hasPermission: (
    agentType: 'voice' | 'chatbot' | 'whatsapp',
    agentId: string,
    permissionId: string
  ) => boolean;
  canContributeFAQ: (assistantId: string) => boolean;
  canViewAnalytics: (agentType: 'voice' | 'chatbot' | 'whatsapp', agentId: string) => boolean;
  canViewCalls: (assistantId: string) => boolean;
  canViewLeads: (agentType: 'voice' | 'chatbot' | 'whatsapp', agentId: string) => boolean;
  canViewTranscripts: (assistantId: string) => boolean;
  canViewConversations: (chatbotId: string) => boolean;
  canViewWhatsAppMessages: (agentId: string) => boolean;
  refresh: () => Promise<void>;
}

const CustomerPermissionsContext = createContext<CustomerPermissionsContextType | null>(null);

export function CustomerPermissionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useCustomerAuth();
  const [permissions, setPermissions] = useState<AgentPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getMyPermissions();
      setPermissions(response.permissions || []);
    } catch (err) {
      console.error('Failed to fetch customer permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      // Don't clear permissions on error - keep stale data
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const checkPermission = useCallback(
    (agentType: 'voice' | 'chatbot' | 'whatsapp', agentId: string, permissionId: string): boolean => {
      return hasPermission(permissions, agentType, agentId, permissionId);
    },
    [permissions]
  );

  const canContributeFAQ = useCallback(
    (assistantId: string): boolean => {
      return checkPermission('voice', assistantId, 'contribute_faq');
    },
    [checkPermission]
  );

  const canViewAnalytics = useCallback(
    (agentType: 'voice' | 'chatbot' | 'whatsapp', agentId: string): boolean => {
      return checkPermission(agentType, agentId, 'view_analytics');
    },
    [checkPermission]
  );

  const canViewCalls = useCallback(
    (assistantId: string): boolean => {
      return checkPermission('voice', assistantId, 'view_calls');
    },
    [checkPermission]
  );

  const canViewLeads = useCallback(
    (agentType: 'voice' | 'chatbot' | 'whatsapp', agentId: string): boolean => {
      return checkPermission(agentType, agentId, 'view_leads');
    },
    [checkPermission]
  );

  const canViewTranscripts = useCallback(
    (assistantId: string): boolean => {
      return checkPermission('voice', assistantId, 'view_transcripts');
    },
    [checkPermission]
  );

  const canViewConversations = useCallback(
    (chatbotId: string): boolean => {
      return checkPermission('chatbot', chatbotId, 'view_conversations');
    },
    [checkPermission]
  );

  const canViewWhatsAppMessages = useCallback(
    (agentId: string): boolean => {
      return checkPermission('whatsapp', agentId, 'view_whatsapp_messages');
    },
    [checkPermission]
  );

  const value: CustomerPermissionsContextType = {
    permissions,
    loading,
    error,
    hasPermission: checkPermission,
    canContributeFAQ,
    canViewAnalytics,
    canViewCalls,
    canViewLeads,
    canViewTranscripts,
    canViewConversations,
    canViewWhatsAppMessages,
    refresh: fetchPermissions,
  };

  return (
    <CustomerPermissionsContext.Provider value={value}>
      {children}
    </CustomerPermissionsContext.Provider>
  );
}

export function useCustomerPermissions(): CustomerPermissionsContextType {
  const context = useContext(CustomerPermissionsContext);
  if (!context) {
    throw new Error('useCustomerPermissions must be used within a CustomerPermissionsProvider');
  }
  return context;
}

// For cases where we want to check without throwing
export function useCustomerPermissionsSafe(): CustomerPermissionsContextType | null {
  return useContext(CustomerPermissionsContext);
}
