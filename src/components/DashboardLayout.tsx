import { ReactNode, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { Navigate } from "react-router-dom";
import { SupportTicketNotificationBanner } from "@/components/SupportTicketNotificationBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");

  // Block customers from accessing admin portal
  const isCustomer = user?.user_metadata?.is_customer === true;
  
  if (!loading && isCustomer) {
    return <Navigate to="/customer-login" replace />;
  }

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setDisplayName(data.full_name || user.email || "");
      } else {
        setDisplayName(user.email || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setDisplayName(user.email || "");
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user?.id}`,
      }, () => {
        fetchProfile(); // Refresh profile when it changes
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <SidebarProvider>
      <SupportTicketNotificationBanner />
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span className="text-muted-foreground">{displayName}</span>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}