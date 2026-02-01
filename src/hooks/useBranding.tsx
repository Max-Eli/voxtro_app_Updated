import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBrandingByEmail, defaultBranding as apiDefaultBranding } from "@/integrations/api/endpoints/branding";

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface BrandingContextValue {
  branding: BrandingSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
  logo_url: null,
  primary_color: "#f97316",
  secondary_color: "#ea580c",
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  loading: true,
  refetch: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async (showLoading = true) => {
    try {
      // Only show loading on initial fetch, not background refreshes
      // This prevents form state from being lost when user switches browser tabs
      if (showLoading) {
        setLoading(true);
      }
      console.log("[Branding] Fetching branding settings...", showLoading ? "(initial)" : "(background)");

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        console.log("[Branding] No user session found");
        setBranding(defaultBranding);
        if (showLoading) setLoading(false);
        return;
      }

      const userEmail = session.user.email;
      console.log("[Branding] User email:", userEmail);

      // Use the Edge Function to fetch branding (bypasses RLS)
      const fetchedBranding = await fetchBrandingByEmail(userEmail);
      console.log("[Branding] Fetched branding:", fetchedBranding);
      setBranding(fetchedBranding);
      if (showLoading) setLoading(false);
    } catch (error) {
      console.error('[Branding] Error:', error);
      setBranding(defaultBranding);
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding(true); // Initial load - show loading spinner

    // Listen for auth state changes to refetch branding
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("[Branding] Auth state changed:", event);
      if (event === 'SIGNED_IN') {
        fetchBranding(true); // New sign in - show loading
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refresh (happens on tab focus) - don't show loading to preserve form state
        fetchBranding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refetch: fetchBranding }}>
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

  // Handle 3-char hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

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

export { defaultBranding };
