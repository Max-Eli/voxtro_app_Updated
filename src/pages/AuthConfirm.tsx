import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import voxtroLogoDark from '@/assets/voxtro-logo-dark.png';

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/auth';

  useEffect(() => {
    const verifyToken = async () => {
      if (!tokenHash || !type) {
        setError('Invalid or missing verification parameters.');
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        // For password recovery, we need to verify the OTP
        if (type === 'recovery') {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (verifyError) {
            console.error('Token verification error:', verifyError);
            setError(verifyError.message || 'Failed to verify reset token. It may have expired.');
            setVerified(false);
          } else if (data.session) {
            console.log('Token verified successfully');
            setVerified(true);
          } else {
            setError('Unable to verify reset token.');
            setVerified(false);
          }
        } else if (type === 'signup' || type === 'email_change') {
          // Handle email confirmation
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === 'signup' ? 'signup' : 'email_change',
          });

          if (verifyError) {
            setError(verifyError.message || 'Failed to verify email.');
          } else {
            toast({
              title: 'Email Verified',
              description: 'Your email has been verified successfully.',
            });
            navigate(next);
            return;
          }
        } else {
          setError('Unknown verification type.');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'An unexpected error occurred.');
      }

      setVerifying(false);
      setLoading(false);
    };

    verifyToken();
  }, [tokenHash, type, navigate, next, toast]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast({
          title: 'Error',
          description: updateError.message,
          variant: 'destructive',
        });
      } else {
        setPasswordUpdated(true);
        toast({
          title: 'Success',
          description: 'Your password has been updated successfully.',
        });
        
        // Sign out and redirect to login after a short delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/auth');
        }, 2000);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update password.',
        variant: 'destructive',
      });
    }

    setUpdating(false);
  };

  // Loading state
  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying your request...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={resolvedTheme === 'dark' ? voxtroLogo : voxtroLogoDark} 
                alt="Voxtro" 
                className="h-32" 
              />
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Verification Failed</CardTitle>
              <CardDescription className="text-destructive">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                The link may have expired or already been used. Please request a new password reset.
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password updated success state
  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={resolvedTheme === 'dark' ? voxtroLogo : voxtroLogoDark} 
                alt="Voxtro" 
                className="h-32" 
              />
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Password Updated!</CardTitle>
              <CardDescription>
                Your password has been successfully changed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Redirecting you to the sign in page...
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Sign In Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password reset form (verified state)
  if (verified && type === 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={resolvedTheme === 'dark' ? voxtroLogo : voxtroLogoDark} 
                alt="Voxtro" 
                className="h-32" 
              />
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={updating || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {updating ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="text-center">
        <p className="text-muted-foreground">Something went wrong. Please try again.</p>
        <Button onClick={() => navigate('/auth')} className="mt-4">
          Back to Sign In
        </Button>
      </div>
    </div>
  );
}
