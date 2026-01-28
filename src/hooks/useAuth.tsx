import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { syncVoiceAssistants } from '@/integrations/api/endpoints';

const VAPI_SYNC_KEY = 'voxtro_last_vapi_sync';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Provider = 'google' | 'apple';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithProvider: (provider: Provider) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInProgressRef = useRef(false);

  // Check if VAPI sync is needed (more than 24 hours since last sync)
  const shouldSyncVapi = (): boolean => {
    const lastSync = localStorage.getItem(VAPI_SYNC_KEY);
    if (!lastSync) return true;
    const lastSyncTime = parseInt(lastSync, 10);
    return Date.now() - lastSyncTime > SYNC_INTERVAL_MS;
  };

  // Perform VAPI sync in background
  const performVapiSync = async () => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    try {
      console.log('Starting automatic VAPI sync...');
      await syncVoiceAssistants();
      localStorage.setItem(VAPI_SYNC_KEY, Date.now().toString());
      console.log('VAPI sync completed successfully');
    } catch (error) {
      console.error('VAPI auto-sync error:', error);
      // Don't throw - this is a background operation
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, 'session exists:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Trigger VAPI sync on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          // Small delay to ensure auth is fully established
          setTimeout(() => {
            if (shouldSyncVapi()) {
              performVapiSync();
            }
          }, 1000);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Auto-sync on app load if user has session and sync is due
      if (session?.user && shouldSyncVapi()) {
        setTimeout(() => performVapiSync(), 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithProvider = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Redirect to /auth so pending invite tokens can be checked
        redirectTo: `${window.location.origin}/auth`
      }
    });
    return { error };
  };

  const signOut = async () => {
    console.log('Starting sign out process...');
    try {
      // First clear local state immediately
      setSession(null);
      setUser(null);
      
      // Clear localStorage manually
      localStorage.removeItem('sb-nzqzmvsrsfynatxojuil-auth-token');
      
      const { error } = await supabase.auth.signOut();
      console.log('Sign out response:', { error });
      if (error) {
        // If session is already missing, that's fine - user is already signed out
        if (error.message?.includes('Auth session missing')) {
          console.log('Session already missing, clearing local state');
          return;
        }
        console.error('Sign out error:', error);
        throw error;
      }
      console.log('Sign out successful');
    } catch (err) {
      // If session is missing, just clear local state - user is already signed out
      if (err?.message?.includes('Auth session missing')) {
        console.log('Handling missing session in catch block');
        return;
      }
      console.error('Sign out catch block:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithProvider,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}