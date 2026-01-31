/**
 * Custom Domains API Endpoints
 */
import { apiClient } from '../client';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface CustomDomain {
  id: string;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  vercel_domain_id?: string;
  verified_at?: string;
  created_at: string;
  cname_target: string;
}

export interface DomainBranding {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
}

export interface DomainLookupResult {
  found: boolean;
  user_id?: string;
  branding?: DomainBranding;
}

// ============================================================================
// Admin Domain Management (requires authentication)
// ============================================================================

/**
 * Get current user's custom domain configuration
 */
export async function getMyCustomDomain(): Promise<CustomDomain | null> {
  return apiClient.get('/api/domains');
}

/**
 * Add a new custom domain
 */
export async function addCustomDomain(domain: string): Promise<CustomDomain> {
  return apiClient.post('/api/domains', { domain });
}

/**
 * Verify domain configuration status
 */
export async function verifyCustomDomain(): Promise<{
  status: 'verified' | 'pending';
  message: string;
  instructions?: string;
}> {
  return apiClient.post('/api/domains/verify');
}

/**
 * Remove custom domain
 */
export async function removeCustomDomain(): Promise<{ success: boolean; message: string }> {
  return apiClient.delete('/api/domains');
}

// ============================================================================
// Public Domain Lookup (no authentication required)
// ============================================================================

/**
 * Look up branding by domain (public endpoint for login page)
 * Uses Supabase Edge Function for public access
 */
export async function lookupDomainBranding(domain: string): Promise<DomainLookupResult> {
  try {
    // Try the Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('get-branding-by-domain', {
      body: null,
      headers: {},
    });

    // If edge function fails, try the backend API
    if (error) {
      console.log('Edge function failed, trying backend API');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/domains/lookup/${encodeURIComponent(domain)}`);
      if (!response.ok) {
        return { found: false };
      }
      return response.json();
    }

    return data;
  } catch (e) {
    console.error('Error looking up domain branding:', e);
    return { found: false };
  }
}

/**
 * Look up branding by domain using the database function directly
 * This works without authentication for the login page
 */
export async function getBrandingByDomain(domain: string): Promise<DomainLookupResult> {
  try {
    const normalizedDomain = domain.toLowerCase().trim().replace(/\/$/, '');

    const { data, error } = await supabase
      .rpc('get_branding_by_domain', { p_domain: normalizedDomain });

    if (error || !data || data.length === 0) {
      return { found: false };
    }

    const branding = data[0];
    return {
      found: true,
      user_id: branding.user_id,
      branding: {
        logo_url: branding.logo_url,
        primary_color: branding.primary_color || '#f97316',
        secondary_color: branding.secondary_color || '#ea580c',
      }
    };
  } catch (e) {
    console.error('Error getting branding by domain:', e);
    return { found: false };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the current hostname is a custom domain
 * (not voxtro.io, vercel.app, or localhost)
 */
export function isCustomDomain(): boolean {
  const hostname = window.location.hostname;
  return !hostname.includes('voxtro.io') &&
         !hostname.includes('vercel.app') &&
         !hostname.includes('localhost') &&
         !hostname.includes('127.0.0.1');
}

/**
 * Get the current hostname for domain lookup
 */
export function getCurrentDomain(): string {
  return window.location.hostname;
}

/**
 * Check if domain is available
 */
export async function isDomainAvailable(domain: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_domain_available', { p_domain: domain.toLowerCase().trim() });

    if (error) {
      console.error('Error checking domain availability:', error);
      return false;
    }

    return data === true;
  } catch (e) {
    console.error('Error checking domain availability:', e);
    return false;
  }
}
