import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CustomerSidebar } from '@/components/CustomerSidebar';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { BrandingProvider, useBranding, hexToHsl } from '@/hooks/useBranding';

function CustomerDashboardContent() {
  const { customer, loading } = useCustomerAuth();
  const { branding, loading: brandingLoading } = useBranding();

  // Load chatbot widget for customer portal
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.voxtro.io';
    const script = document.createElement('script');
    script.src = `${apiBaseUrl}/api/widget/90e3f339-4025-4f62-bb91-03366abcfa40/script.js?v=` + Date.now();
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Remove widget container if it exists
      const widget = document.getElementById('voxtro-widget');
      if (widget) {
        widget.remove();
      }
    };
  }, []);

  // Apply custom branding CSS variables
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      const primaryHsl = hexToHsl(branding.primary_color);
      const secondaryHsl = hexToHsl(branding.secondary_color);
      
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--sidebar-primary', primaryHsl);
      root.style.setProperty('--sidebar-accent', primaryHsl);
      
      return () => {
        // Reset to defaults when unmounting
        root.style.removeProperty('--primary');
        root.style.removeProperty('--sidebar-primary');
        root.style.removeProperty('--sidebar-accent');
      };
    }
  }, [branding]);

  if (loading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer-login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/10">
        <CustomerSidebar customLogo={branding?.logo_url} />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 sticky top-0 z-50 shadow-sm">
            <SidebarTrigger className="hover:bg-muted/50 transition-colors" />
            <div className="ml-4 flex-1">
              <h1 className="font-semibold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Welcome back, <span className="text-primary">{customer.full_name}</span>
              </h1>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function CustomerDashboardLayout() {
  return (
    <BrandingProvider>
      <CustomerDashboardContent />
    </BrandingProvider>
  );
}
