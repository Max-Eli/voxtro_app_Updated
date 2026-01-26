import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Crown, User, Mail, Trash2, LogOut, Loader2, Building2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface TeamOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_org_id: string;
  user_id: string;
  role: "owner" | "teammate";
  joined_at: string;
  user_email?: string;
}

interface TeamInvitation {
  id: string;
  team_org_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const Teams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamOrganization[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamOrganization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      fetchTeamInvitations(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);

      // Auto-select first team if available
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamOrgId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_org_id", teamOrgId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchTeamInvitations = async (teamOrgId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("team_org_id", teamOrgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .substring(0, 50) + "-" + Date.now().toString(36);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("team_organizations")
        .insert({
          name: newTeamName.trim(),
          slug: generateSlug(newTeamName),
          description: newTeamDescription.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Team "${newTeamName}" created successfully`);
      setNewTeamName("");
      setNewTeamDescription("");
      setShowCreateDialog(false);
      await fetchTeams();
      setSelectedTeam(data);
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const normalizedEmail = inviteEmail.trim().toLowerCase();

      // First, delete any existing non-pending invitations for this email
      // (cancelled or expired ones that might be blocking a new invite)
      await supabase
        .from("team_invitations")
        .delete()
        .eq("team_org_id", selectedTeam.id)
        .ilike("email", normalizedEmail)
        .neq("status", "pending");

      const { data, error } = await supabase
        .from("team_invitations")
        .insert({
          team_org_id: selectedTeam.id,
          email: normalizedEmail,
          invited_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("This email already has a pending invitation to this team");
          return;
        }
        throw error;
      }

      // Generate invite URL
      const inviteUrl = `${window.location.origin}/invite/${data.token}`;

      // Send invitation email via backend API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://voxtro-backend.onrender.com';
      console.log("[Teams] Sending invitation email to:", normalizedEmail);
      console.log("[Teams] API URL:", `${apiBaseUrl}/api/notifications/team-invite`);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        console.log("[Teams] Auth token present:", !!token);

        const requestBody = {
          email: normalizedEmail,
          team_name: selectedTeam.name,
          inviter_name: user?.user_metadata?.full_name || user?.email,
          invite_url: inviteUrl,
        };
        console.log("[Teams] Request body:", requestBody);

        const emailResponse = await fetch(`${apiBaseUrl}/api/notifications/team-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log("[Teams] Email response status:", emailResponse.status);
        const responseData = await emailResponse.json().catch(() => ({}));
        console.log("[Teams] Email response data:", responseData);

        if (!emailResponse.ok) {
          console.error('[Teams] Failed to send invitation email:', responseData);
          // Still copy link as fallback
          await navigator.clipboard.writeText(inviteUrl);
          toast.success(`Invitation created for ${normalizedEmail}`, {
            description: "Email failed to send, but link copied to clipboard.",
            duration: 5000,
          });
        } else {
          toast.success(`Invitation sent to ${normalizedEmail}!`, {
            description: "They'll receive an email with instructions to join.",
            duration: 5000,
          });
        }
      } catch (emailError) {
        console.error('[Teams] Email sending error:', emailError);
        await navigator.clipboard.writeText(inviteUrl);
        toast.success(`Invitation created for ${normalizedEmail}`, {
          description: "Email failed to send, but link copied to clipboard.",
          duration: 5000,
        });
      }
      setInviteEmail("");
      await fetchTeamInvitations(selectedTeam.id);
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      // Delete the invitation completely so the same email can be re-invited
      const { error } = await supabase
        .from("team_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation cancelled");
      if (selectedTeam) {
        await fetchTeamInvitations(selectedTeam.id);
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error("You cannot remove yourself from the team");
      return;
    }

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed from team");
      if (selectedTeam) {
        await fetchTeamMembers(selectedTeam.id);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleLeaveTeam = async (teamOrgId: string) => {
    const member = members.find(m => m.user_id === user?.id);
    if (!member) return;

    if (member.role === "owner") {
      const otherOwners = members.filter(m => m.role === "owner" && m.user_id !== user?.id);
      if (otherOwners.length === 0) {
        toast.error("You cannot leave the team as the only owner. Transfer ownership first or delete the team.");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_org_id", teamOrgId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("You have left the team");
      setSelectedTeam(null);
      await fetchTeams();
    } catch (error) {
      console.error("Error leaving team:", error);
      toast.error("Failed to leave team");
    }
  };

  const handleDeleteTeam = async (teamOrgId: string) => {
    if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("team_organizations")
        .delete()
        .eq("id", teamOrgId);

      if (error) throw error;

      toast.success("Team deleted successfully");
      setSelectedTeam(null);
      await fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(token);
    toast.success("Invite link copied to clipboard");
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  const isTeamOwner = (teamId: string) => {
    return members.some(m => m.team_org_id === teamId && m.user_id === user?.id && m.role === "owner");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teams</h1>
          <p className="text-muted-foreground">
            Create and manage team organizations to collaborate with others
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Team</DialogTitle>
              <DialogDescription>
                Create a team organization to share tasks, support tickets, and agents with your teammates.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="e.g., Marketing Team, Engineering"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-description">Description (optional)</Label>
                <Input
                  id="team-description"
                  placeholder="What is this team for?"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Teams List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Teams
            </CardTitle>
            <CardDescription>
              Select a team to manage members and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">You don't have any teams yet</p>
                <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTeam?.id === team.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {team.description}
                          </p>
                        )}
                      </div>
                      {team.created_by === user?.id && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTeam ? (
            <>
              {/* Team Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTeam.name}</CardTitle>
                      {selectedTeam.description && (
                        <CardDescription>{selectedTeam.description}</CardDescription>
                      )}
                    </div>
                    {isTeamOwner(selectedTeam.id) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTeam(selectedTeam.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLeaveTeam(selectedTeam.id)}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Team
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Invite Members */}
              {isTeamOwner(selectedTeam.id) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Invite Members
                    </CardTitle>
                    <CardDescription>
                      Send invitations to add teammates to your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInviteMember()}
                      />
                      <Button onClick={handleInviteMember} disabled={inviting}>
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </div>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <Label className="text-sm text-muted-foreground">Pending Invitations</Label>
                        {invitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{invitation.email}</span>
                              <Badge variant="secondary" className="text-xs">
                                Pending
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyInviteLink(invitation.token)}
                              >
                                {copiedInvite === invitation.token ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members ({members.length})
                  </CardTitle>
                  <CardDescription>
                    People who have access to this team's resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {member.role === "owner" ? (
                              <Crown className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user_id === user?.id ? "You" : `User ${member.user_id.slice(0, 8)}...`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                            {member.role === "owner" ? "Owner" : "Teammate"}
                          </Badge>
                          {isTeamOwner(selectedTeam.id) && member.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id, member.user_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Team</h3>
                <p className="text-muted-foreground text-center">
                  Choose a team from the list to view and manage its members
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Teams;
