import { useState, useEffect } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VoiceConnection {
  id: string;
  org_name: string | null;
  org_id: string | null;
  is_active: boolean;
}

interface OrganizationSwitcherProps {
  onSwitch?: () => void;
  compact?: boolean;
}

export function OrganizationSwitcher({ onSwitch, compact = false }: OrganizationSwitcherProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<VoiceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('voice_connections')
        .select('id, org_name, org_id, is_active')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('OrganizationSwitcher: Fetched connections:', data);
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  // Expose refresh method via window for debugging
  useEffect(() => {
    (window as any).__refreshOrgSwitcher = fetchConnections;
    return () => {
      delete (window as any).__refreshOrgSwitcher;
    };
  }, [user]);

  const handleSwitch = async (connectionId: string) => {
    if (switching) return;
    
    const connection = connections.find(c => c.id === connectionId);
    if (!connection || connection.is_active) return;

    setSwitching(true);
    try {
      // Deactivate all connections
      const { error: deactivateError } = await supabase
        .from('voice_connections')
        .update({ is_active: false })
        .eq('user_id', user?.id);

      if (deactivateError) throw deactivateError;

      // Activate selected one
      const { error: activateError } = await supabase
        .from('voice_connections')
        .update({ is_active: true })
        .eq('id', connectionId);

      if (activateError) throw activateError;

      toast.success(`Switched to "${connection.org_name || 'Organization'}"`);
      await fetchConnections();
      onSwitch?.();
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  const activeConnection = connections.find(c => c.is_active);

  // Don't show if no connections or only one connection
  if (loading || connections.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "default"} className="gap-2" disabled={switching}>
          <Building2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span className={compact ? "text-xs max-w-[100px] truncate" : "max-w-[150px] truncate"}>
            {activeConnection?.org_name || 'Select Org'}
          </span>
          <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Vapi Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {connections.map((connection) => (
          <DropdownMenuItem
            key={connection.id}
            onClick={() => handleSwitch(connection.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={connection.is_active}
          >
            <span className={connection.is_active ? 'font-medium' : ''}>
              {connection.org_name || 'Unnamed Organization'}
            </span>
            {connection.is_active && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
