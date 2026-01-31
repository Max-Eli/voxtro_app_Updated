/**
 * Custom Domain Hook
 *
 * Detects if the current hostname is a custom domain and fetches
 * the associated branding. Used primarily on the customer login page
 * to show the business owner's branding.
 */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { isCustomDomain, getCurrentDomain, getBrandingByDomain, DomainBranding } from '@/integrations/api/endpoints/domains';

interface CustomDomainContextType {
  isCustomDomain: boolean;
  domain: string | null;
  userId: string | null;
  branding: DomainBranding | null;
  loading: boolean;
  error: string | null;
}

const CustomDomainContext = createContext<CustomDomainContextType>({
  isCustomDomain: false,
  domain: null,
  userId: null,
  branding: null,
  loading: true,
  error: null,
});

export function CustomDomainProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CustomDomainContextType>({
    isCustomDomain: false,
    domain: null,
    userId: null,
    branding: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function detectDomain() {
      try {
        const isCustom = isCustomDomain();

        if (!isCustom) {
          setState({
            isCustomDomain: false,
            domain: null,
            userId: null,
            branding: null,
            loading: false,
            error: null,
          });
          return;
        }

        const domain = getCurrentDomain();
        const result = await getBrandingByDomain(domain);

        if (result.found && result.branding) {
          setState({
            isCustomDomain: true,
            domain,
            userId: result.user_id || null,
            branding: result.branding,
            loading: false,
            error: null,
          });
        } else {
          // Custom domain but not configured/verified
          setState({
            isCustomDomain: true,
            domain,
            userId: null,
            branding: null,
            loading: false,
            error: 'Domain not configured or not verified',
          });
        }
      } catch (e) {
        console.error('Error detecting custom domain:', e);
        setState({
          isCustomDomain: false,
          domain: null,
          userId: null,
          branding: null,
          loading: false,
          error: 'Failed to detect domain',
        });
      }
    }

    detectDomain();
  }, []);

  return (
    <CustomDomainContext.Provider value={state}>
      {children}
    </CustomDomainContext.Provider>
  );
}

/**
 * Hook to access custom domain context
 */
export function useCustomDomain(): CustomDomainContextType {
  return useContext(CustomDomainContext);
}

/**
 * Simple hook for checking if on custom domain without context
 * Use this when you just need a quick check
 */
export function useIsCustomDomain(): boolean {
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    setIsCustom(isCustomDomain());
  }, []);

  return isCustom;
}
