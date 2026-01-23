import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface BrandingContextValue {
  branding: BrandingSettings | null;
  loading: boolean;
}

const defaultBranding: BrandingSettings = {
  logo_url: null,
  primary_color: "#f97316",
  secondary_color: "#ea580c",
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  loading: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      // Get current user's email to find the admin they're assigned to
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setBranding(defaultBranding);
        setLoading(false);
        return;
      }

      // First check if they're a customer - get the admin's branding
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (customer) {
        // Customer - find their assigned admin's branding through any assignment
        // All assignment tables have assigned_by which is the admin's user_id
        let adminUserId: string | null = null;

        // Try chatbot assignments first
        const { data: chatbotAssignment } = await supabase
          .from('customer_chatbot_assignments')
          .select('assigned_by')
          .eq('customer_id', customer.id)
          .limit(1)
          .maybeSingle();

        if (chatbotAssignment?.assigned_by) {
          adminUserId = chatbotAssignment.assigned_by;
        }

        // Try voice assistant assignments if no chatbot found
        if (!adminUserId) {
          const { data: voiceAssignment } = await supabase
            .from('customer_assistant_assignments')
            .select('assigned_by')
            .eq('customer_id', customer.id)
            .limit(1)
            .maybeSingle();

          if (voiceAssignment?.assigned_by) {
            adminUserId = voiceAssignment.assigned_by;
          }
        }

        // Try whatsapp agent assignments if still no admin found
        if (!adminUserId) {
          const { data: waAssignment } = await supabase
            .from('customer_whatsapp_agent_assignments')
            .select('assigned_by')
            .eq('customer_id', customer.id)
            .limit(1)
            .maybeSingle();

          if (waAssignment?.assigned_by) {
            adminUserId = waAssignment.assigned_by;
          }
        }

        // Get branding for the admin
        if (adminUserId) {
          const { data: brandingData } = await supabase
            .from('branding_settings')
            .select('logo_url, primary_color, secondary_color')
            .eq('user_id', adminUserId)
            .maybeSingle();

          if (brandingData) {
            setBranding({
              logo_url: brandingData.logo_url,
              primary_color: brandingData.primary_color || defaultBranding.primary_color,
              secondary_color: brandingData.secondary_color || defaultBranding.secondary_color,
            });
            setLoading(false);
            return;
          }
        }
      }

      // Default branding if no custom branding found
      setBranding(defaultBranding);
    } catch (error) {
      console.error('Error fetching branding:', error);
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}

// Helper function to convert hex to HSL for CSS variables
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
