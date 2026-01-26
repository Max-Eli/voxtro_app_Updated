import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Users, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import voxtroLogo from "@/assets/voxtro-logo.png";

interface InviteDetails {
  id: string;
  team_org_id: string;
  email: string;
  status: string;
  expires_at: string;
  team_name?: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const acceptAttemptedRef = useRef(false);

  useEffect(() => {
    console.log("[AcceptInvite] Component mounted, token:", token);
    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  useEffect(() => {
    console.log("[AcceptInvite] Auth state check:", {
      authLoading,
      user: user?.email,
      invite: invite?.email,
      error,
      success,
      accepting,
      acceptAttempted: acceptAttemptedRef.current
    });
    // If user is logged in and invite is valid, check if we can auto-accept
    // Use ref to prevent multiple acceptance attempts
    if (!authLoading && user && invite && !error && !success && !accepting && !acceptAttemptedRef.current) {
      console.log("[AcceptInvite] Checking email match:", user.email?.toLowerCase(), "vs", invite.email.toLowerCase());
      if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
        // Auto-accept the invitation
        console.log("[AcceptInvite] Email matches, auto-accepting...");
        acceptAttemptedRef.current = true;
        handleAcceptInvite();
      }
    }
  }, [user, authLoading, invite, error, success, accepting]);

  const fetchInviteDetails = async () => {
    console.log("[AcceptInvite] Fetching invite details for token:", token);
    try {
      // Fetch invitation with team name
      const { data, error: fetchError } = await supabase
        .from("team_invitations")
        .select(`
          id,
          team_org_id,
          email,
          status,
          expires_at,
          team_organizations (name)
        `)
        .eq("token", token)
        .single();

      console.log("[AcceptInvite] Fetch result:", { data, fetchError });

      if (fetchError || !data) {
        console.error("[AcceptInvite] Invalid or missing invitation:", fetchError);
        setError("This invitation link is invalid or has already been used.");
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired. Please ask the team owner to send a new invitation.");
        setLoading(false);
        return;
      }

      // Check if already accepted
      if (data.status !== "pending") {
        setError("This invitation has already been used.");
        setLoading(false);
        return;
      }

      setInvite({
        ...data,
        team_name: (data.team_organizations as any)?.name || "Unknown Team",
      });
    } catch (err) {
      console.error("Error fetching invite:", err);
      setError("Failed to load invitation details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    console.log("[AcceptInvite] handleAcceptInvite called", {
      invite,
      userEmail: user?.email,
      token,
      accepting
    });

    if (!invite || !user) {
      console.log("[AcceptInvite] Missing invite or user, aborting");
      return;
    }

    if (accepting) {
      console.log("[AcceptInvite] Already accepting, skipping");
      return;
    }

    setAccepting(true);
    try {
      console.log("[AcceptInvite] Calling accept_team_invitation RPC with token:", token);

      // Call the accept_team_invitation function
      const { data, error: acceptError } = await supabase.rpc("accept_team_invitation", {
        invitation_token: token,
      });

      console.log("[AcceptInvite] RPC result:", { data, acceptError });

      if (acceptError) {
        console.error("[AcceptInvite] RPC error:", acceptError);
        throw new Error(acceptError.message || "Database error while accepting invitation");
      }

      // Handle case where data is null or undefined
      if (!data) {
        console.error("[AcceptInvite] No data returned from RPC");
        throw new Error("No response from server. Please try again.");
      }

      const result = data as { success: boolean; error?: string; message?: string };
      console.log("[AcceptInvite] Parsed result:", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to accept invitation");
      }

      setSuccess(true);
      toast.success(`You've joined ${invite.team_name}!`);
      console.log("[AcceptInvite] Successfully joined team, redirecting...");

      // Redirect to teams page after 2 seconds
      setTimeout(() => {
        navigate("/teams");
      }, 2000);
    } catch (err: any) {
      console.error("[AcceptInvite] Error accepting invite:", err);
      setError(err.message || "Failed to accept invitation");
      toast.error(err.message || "Failed to accept invitation");
      // Reset the attempt flag so user can try again
      acceptAttemptedRef.current = false;
    } finally {
      setAccepting(false);
    }
  };

  // Store invite token in localStorage for after auth
  const storeInviteAndRedirect = (path: string) => {
    if (token) {
      localStorage.setItem("pending_invite_token", token);
    }
    navigate(path);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={voxtroLogo} alt="Voxtro" className="h-12" />
          </div>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            {error ? "Something went wrong" : success ? "Welcome to the team!" : "You've been invited to join a team"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <p className="text-muted-foreground">{error}</p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <p className="text-muted-foreground">
                You're now a member of <strong>{invite?.team_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to your teams...</p>
            </div>
          ) : invite ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{invite.team_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Invited: {invite.email}
                  </p>
                </div>
              </div>

              {user ? (
                // User is logged in
                user.email?.toLowerCase() === invite.email.toLowerCase() ? (
                  // Email matches - show accept button (or auto-accepting)
                  <div className="space-y-4">
                    {accepting ? (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Joining team...</p>
                      </div>
                    ) : (
                      <Button onClick={handleAcceptInvite} className="w-full" size="lg">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Invitation
                      </Button>
                    )}
                  </div>
                ) : (
                  // Email doesn't match
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      This invitation was sent to <strong>{invite.email}</strong>, but you're signed in as <strong>{user.email}</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please sign out and sign in with the correct account, or ask for a new invitation.
                    </p>
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </div>
                )
              ) : (
                // User is not logged in
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in or create an account to join this team
                  </p>
                  <div className="grid gap-3">
                    <Button
                      onClick={() => storeInviteAndRedirect("/auth")}
                      className="w-full"
                      size="lg"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => storeInviteAndRedirect("/auth?signup=true")}
                      className="w-full"
                      size="lg"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Make sure to use the email: <strong>{invite.email}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
