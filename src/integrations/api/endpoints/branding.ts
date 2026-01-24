/**
 * Branding API Endpoints
 */
import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nzqzmvsrsfynatxojuil.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cXptdnNyc2Z5bmF0eG9qdWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTQwNzIsImV4cCI6MjA4NDU5MDA3Mn0.avKeLENuqO2nKbaGnaZKHkD1uhp6HMk_Jlsr-GHSwqs";

export interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export const defaultBranding: BrandingSettings = {
  logo_url: null,
  primary_color: "#f97316",
  secondary_color: "#ea580c",
};

/**
 * Fetch branding settings by customer email (public endpoint - no auth required)
 * Used on the login page to show the admin's branding before the customer logs in
 * Calls Supabase Edge Function which uses service_role to bypass RLS
 */
export async function fetchBrandingByEmail(email: string): Promise<BrandingSettings> {
  try {
    console.log('[Branding API] Fetching branding for email:', email);
    const url = `${SUPABASE_URL}/functions/v1/get-customer-branding`;
    console.log('[Branding API] URL:', url);

    const response = await axios.get<BrandingSettings>(url, {
      params: { email },
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[Branding API] Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Branding API] Error fetching branding:', error);
    return defaultBranding;
  }
}
