import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bot } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import voxtroLogoDark from '@/assets/voxtro-logo-dark.png';

export default function Auth() {
  const { user, signUp, signIn, signInWithProvider, loading, session, resetPassword } = useAuth();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Debug logging
  console.log('Auth page - loading:', loading, 'user:', !!user, 'session:', !!session);

  // Show loading while auth state is being determined
  if (loading) {
    console.log('Auth page showing loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated (only after loading is complete)
  if (!loading && user) {
    // Check if user is a customer - redirect them to customer portal instead
    const isCustomer = user.user_metadata?.is_customer === true;
    if (isCustomer) {
      console.log('Auth page redirecting to customer portal - user is a customer');
      return <Navigate to="/customer-login" replace />;
    }

    // Check for pending team invite token
    const pendingInviteToken = localStorage.getItem('pending_invite_token');
    if (pendingInviteToken) {
      console.log('Auth page redirecting to invite acceptance - pending invite token found');
      localStorage.removeItem('pending_invite_token');
      return <Navigate to={`/invite/${pendingInviteToken}`} replace />;
    }

    console.log('Auth page redirecting to dashboard - user exists');
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;

    // Check if passwords match
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      setSubmitLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Please check your email to confirm your account.',
      });
    }

    setSubmitLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }

    setSubmitLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const { error } = await resetPassword(email);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Password reset email sent. Please check your inbox.',
      });
      setShowForgotPassword(false);
    }

    setSubmitLoading(false);
  };

  const handleProviderSignIn = async (provider: 'google' | 'apple') => {
    const { error } = await signInWithProvider(provider);
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative overflow-hidden">
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Logo */}
          <div className="mb-8">
            <img
              src={voxtroLogo}
              alt="Voxtro"
              className="h-24 drop-shadow-2xl"
            />
          </div>

          {/* Tagline */}
          <h1 className="text-4xl font-normal text-white text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            AI-Powered Customer Engagement
          </h1>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white force-light">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={resolvedTheme === 'dark' ? voxtroLogo : voxtroLogoDark}
              alt="Voxtro"
              className="h-16"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-gray-600">
              {isSignUp
                ? 'Start building amazing chatbots today'
                : 'Sign in to continue to your dashboard'}
            </p>
          </div>

          {!isSignUp ? (
            // Sign In Form
            <>
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-700">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-700">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-[#e45133] hover:text-[#cc472e] font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#e45133] hover:bg-[#cc472e] text-white font-medium"
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Signing in...' : 'Sign in'}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 text-gray-500">or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleProviderSignIn('google')}
                    className="w-full h-12 border-gray-300 hover:bg-gray-50"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-gray-700">Email</Label>
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#e45133] hover:bg-[#cc472e]"
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Sending...' : 'Send reset link'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Back to sign in
                  </button>
                </form>
              )}
              <p className="mt-8 text-center text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="font-semibold text-[#e45133] hover:text-[#cc472e]"
                >
                  Sign up for free
                </button>
              </p>
            </>
          ) : (
            // Sign Up Form
            <>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-gray-700">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-700">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-700">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-gray-700">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                    className="h-12 border-gray-300 focus:border-[#e45133] focus:ring-[#e45133] text-gray-900 bg-white"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#e45133] hover:bg-[#cc472e] text-white font-medium mt-2"
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Creating account...' : 'Create account'}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500">or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleProviderSignIn('google')}
                  className="w-full h-12 border-gray-300 hover:bg-gray-50"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
              <p className="mt-8 text-center text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="font-semibold text-[#e45133] hover:text-[#cc472e]"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#e45133] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#e45133] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
