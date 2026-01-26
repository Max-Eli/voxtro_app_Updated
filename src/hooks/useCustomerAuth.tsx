import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  weekly_summary_enabled: boolean;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Customer>) => Promise<{ error: any }>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for customer session using magic link or custom token
    checkCustomerSession();
  }, []);

  const checkCustomerSession = async () => {
    try {
      console.log("Checking customer session...");
      // Check current Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session found:", !!session, "User:", session?.user?.email);

      if (session?.user?.user_metadata?.is_customer) {
        console.log("User is a customer, fetching profile...");
        const customerEmail = session.user.email;

        // Try direct query first (works for authenticated customers with correct user_id)
        let { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('email', customerEmail)
          .maybeSingle();

        // If direct query fails due to RLS, use the secure RPC function
        if (error || !data) {
          console.log("Direct query failed, trying RPC function...");
          const { data: rpcResults, error: rpcError } = await supabase
            .rpc('verify_customer_for_signin', { p_email: customerEmail });

          if (!rpcError && rpcResults?.[0]) {
            data = rpcResults[0];
            error = null;
          }
        }

        console.log("Customer profile fetch result:", data, error);

        if (!error && data) {
          console.log("Setting customer data:", data);
          setCustomer(data);
        } else {
          console.log("No customer data found or error occurred, clearing session");
          // Clear invalid session
          await supabase.auth.signOut();
        }
      } else {
        console.log("User is not a customer or no session");
      }
    } catch (error) {
      console.error('Error checking customer session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("Customer sign in attempt for:", email);

    try {
      // First verify customer exists using secure RPC function
      // This bypasses RLS safely for sign-in verification
      const { data: customerResults, error: customerError } = await supabase
        .rpc('verify_customer_for_signin', { p_email: email });

      const customerData = customerResults?.[0] || null;
      console.log("Customer lookup result:", customerData ? "found" : "not found", customerError);

      if (customerError || !customerData) {
        return { error: { message: 'Customer not found or access denied' } };
      }

      console.log("Attempting auth sign in...");
      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log("Auth sign in result:", authData.user ? "success" : "failed", authError);

      if (authError) {
        return { error: { message: 'Invalid email or password' } };
      }

      console.log("User metadata:", authData.user?.user_metadata);

      // Verify the user has customer metadata
      if (!authData.user?.user_metadata?.is_customer) {
        console.log("User does not have customer metadata, signing out");
        await supabase.auth.signOut();
        return { error: { message: 'Access denied - not a customer account' } };
      }

      console.log("Customer sign in successful");
      setCustomer(customerData);

      // Update last login
      await supabase
        .from('customers')
        .update({ last_login: new Date().toISOString() })
        .eq('id', customerData.id);

      return { error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/customer-dashboard`,
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCustomer(null);
  };

  const updateProfile = async (updates: Partial<Customer>) => {
    if (!customer) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customer.id)
        .select()
        .single();

      if (!error && data) {
        setCustomer(data);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  return (
    <CustomerAuthContext.Provider value={{
      customer,
      loading,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}