import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Save, Users, Bot, Plus, Trash2, MessageCircle, Sun, Moon, Palette, Link2, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BrandingSettings } from "@/components/BrandingSettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/ThemeProvider";
import { usePersistedState } from "@/hooks/usePersistedState";
import { validateVoiceConnection, validateElevenLabsConnection } from "@/integrations/api/endpoints";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface NotificationPreferences {
  id?: string;
  user_id: string;
  chat_started: boolean;
  chat_ended: boolean;
  chat_error: boolean;
  notification_email?: string;
}

interface VoiceConnection {
  id: string;
  user_id: string;
  api_key: string;
  public_key: string | null;
  org_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface ElevenLabsConnection {
  id: string;
  user_id: string;
  api_key: string;
  org_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface OpenAIConnection {
  id: string;
  user_id: string;
  api_key: string;
  org_name: string | null;
  is_active: boolean;
  created_at: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    user_id: "",
    chat_started: false,
    chat_ended: false,
    chat_error: false,
    notification_email: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Multi-organization voice connection state
  const [voiceConnections, setVoiceConnections] = useState<VoiceConnection[]>([]);
  // Use persisted state to prevent data loss on tab switches
  const [newVoiceApiKey, setNewVoiceApiKey, clearNewVoiceApiKey] = usePersistedState("settings_newVoiceApiKey", "");
  const [newVoicePublicKey, setNewVoicePublicKey, clearNewVoicePublicKey] = usePersistedState("settings_newVoicePublicKey", "");
  const [newOrgName, setNewOrgName, clearNewOrgName] = usePersistedState("settings_newOrgName", "");
  const [validatingVoice, setValidatingVoice] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // ElevenLabs connection state
  const [elevenLabsConnections, setElevenLabsConnections] = useState<ElevenLabsConnection[]>([]);
  const [newElevenLabsApiKey, setNewElevenLabsApiKey, clearNewElevenLabsApiKey] = usePersistedState("settings_newElevenLabsApiKey", "");
  const [newElevenLabsOrgName, setNewElevenLabsOrgName, clearNewElevenLabsOrgName] = usePersistedState("settings_newElevenLabsOrgName", "");
  const [validatingElevenLabs, setValidatingElevenLabs] = useState(false);
  const [showElevenLabsAddForm, setShowElevenLabsAddForm] = useState(false);

  // OpenAI connection state
  const [openAIConnections, setOpenAIConnections] = useState<OpenAIConnection[]>([]);
  const [newOpenAIApiKey, setNewOpenAIApiKey, clearNewOpenAIApiKey] = usePersistedState("settings_newOpenAIApiKey", "");
  const [newOpenAIOrgName, setNewOpenAIOrgName, clearNewOpenAIOrgName] = usePersistedState("settings_newOpenAIOrgName", "");
  const [validatingOpenAI, setValidatingOpenAI] = useState(false);
  const [showOpenAIAddForm, setShowOpenAIAddForm] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
      }
      setEmail(user.email || "");
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchNotificationPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setNotificationPrefs(data);
      } else {
        setNotificationPrefs({
          user_id: user.id,
          chat_started: false,
          chat_ended: false,
          chat_error: false,
          notification_email: user.email || "",
        });
      }
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    }
  };

  const fetchVoiceConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('voice_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVoiceConnections(data || []);
    } catch (error: any) {
      console.error('Error fetching voice connections:', error);
    }
  };

  const fetchElevenLabsConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('elevenlabs_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setElevenLabsConnections(data || []);
    } catch (error: any) {
      console.error('Error fetching ElevenLabs connections:', error);
    }
  };

  const fetchOpenAIConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('openai_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOpenAIConnections(data || []);
    } catch (error: any) {
      console.error('Error fetching OpenAI connections:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchNotificationPreferences(), fetchVoiceConnections(), fetchElevenLabsConnections(), fetchOpenAIConnections()]);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const hasEmailChanged = email !== user.email;
      const hasNameChanged = fullName.trim() !== (profile?.full_name || "");

      if (hasEmailChanged && email.trim()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        });

        if (emailError) throw emailError;

        toast({
          title: "Email Update Sent",
          description: "Please check both your old and new email addresses to confirm the change",
        });
      }

      if (hasNameChanged) {
        const profileData = {
          user_id: user.id,
          full_name: fullName.trim() || null,
          email: user.email,
        };

        if (profile) {
          const { error } = await supabase
            .from('profiles')
            .update({ full_name: profileData.full_name })
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('profiles')
            .insert(profileData);

          if (error) throw error;
        }
      }

      if (!hasEmailChanged && hasNameChanged) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else if (!hasEmailChanged && !hasNameChanged) {
        toast({
          title: "No Changes",
          description: "No changes were made to your profile",
        });
      }

      await fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      let errorMessage = "Failed to update profile";
      
      if (error.message?.includes('email')) {
        errorMessage = "Failed to update email. Please check the email format.";
      }
      
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (notificationPrefs.id) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            chat_started: notificationPrefs.chat_started,
            chat_ended: notificationPrefs.chat_ended,
            chat_error: notificationPrefs.chat_error,
            notification_email: notificationPrefs.notification_email || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            chat_started: notificationPrefs.chat_started,
            chat_ended: notificationPrefs.chat_ended,
            chat_error: notificationPrefs.chat_error,
            notification_email: notificationPrefs.notification_email || null,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });

      await fetchNotificationPreferences();
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from your current password",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // First, verify the current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      // Current password verified, now update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = "Failed to update password";

      if (error.message?.includes('weak')) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.message?.includes('same')) {
        errorMessage = "New password must be different from your current password.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddVoiceConnection = async () => {
    if (!newVoiceApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name",
        variant: "destructive",
      });
      return;
    }

    setValidatingVoice(true);
    try {
      // Check for user and token before validating
      const { data: { session } } = await supabase.auth.getSession();
      if (!user || !session?.access_token) {
        toast({
          title: "Not Logged In",
          description: "You must be logged in to validate VAPI credentials. Please sign in and try again.",
          variant: "destructive",
        });
        setValidatingVoice(false);
        return;
      }
      const validationResp = await validateVoiceConnection(
        newVoiceApiKey.trim(),
        newVoicePublicKey.trim()
      );
      const validationData = validationResp?.data || validationResp;
      if (!validationData.valid) {
        toast({
          title: "Invalid Credentials",
          description: validationData.message || "The credentials you provided are not valid.",
          variant: "destructive",
        });
        return;
      }

      // If this is the first connection, make it active
      const isFirstConnection = voiceConnections.length === 0;

      const { error: saveError } = await supabase
        .from('voice_connections')
        .insert({
          user_id: user?.id,
          api_key: newVoiceApiKey.trim(),
          public_key: newVoicePublicKey.trim() || null,
          org_name: newOrgName.trim(),
          is_active: isFirstConnection,
        });

      if (saveError) {
        if (saveError.code === '23505') {
          toast({
            title: "Duplicate Connection",
            description: "This API key is already connected",
            variant: "destructive",
          });
          return;
        }
        throw saveError;
      }

      toast({
        title: "Success",
        description: `Organization "${newOrgName}" connected successfully`,
      });

      // Clear persisted state on successful submission
      clearNewVoiceApiKey();
      clearNewVoicePublicKey();
      clearNewOrgName();
      setShowAddForm(false);
      await fetchVoiceConnections();
    } catch (error: any) {
      console.error('Error connecting voice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect voice service",
        variant: "destructive",
      });
    } finally {
      setValidatingVoice(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    const connection = voiceConnections.find(c => c.id === connectionId);
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('voice_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      // If we deleted the active connection, activate the first remaining one
      if (connection.is_active && voiceConnections.length > 1) {
        const remaining = voiceConnections.filter(c => c.id !== connectionId);
        if (remaining.length > 0) {
          await supabase
            .from('voice_connections')
            .update({ is_active: true })
            .eq('id', remaining[0].id);
        }
      }

      toast({
        title: "Success",
        description: `Organization "${connection.org_name}" removed`,
      });

      await fetchVoiceConnections();
    } catch (error: any) {
      console.error('Error removing connection:', error);
      toast({
        title: "Error",
        description: "Failed to remove organization",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePublicKey = async (connectionId: string, publicKey: string) => {
    try {
      const { error } = await supabase
        .from('voice_connections')
        .update({ public_key: publicKey.trim() || null })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Public key updated",
      });

      await fetchVoiceConnections();
    } catch (error: any) {
      console.error('Error updating public key:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddElevenLabsConnection = async () => {
    if (!newElevenLabsApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (!newElevenLabsOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connection name",
        variant: "destructive",
      });
      return;
    }

    setValidatingElevenLabs(true);
    try {
      const validationData = await validateElevenLabsConnection(newElevenLabsApiKey.trim());

      if (!validationData.valid) {
        toast({
          title: "Invalid API Key",
          description: "The API key you provided is not valid",
          variant: "destructive",
        });
        return;
      }

      const isFirstConnection = elevenLabsConnections.length === 0;

      const { error: saveError } = await supabase
        .from('elevenlabs_connections')
        .insert({
          user_id: user?.id,
          api_key: newElevenLabsApiKey.trim(),
          org_name: newElevenLabsOrgName.trim(),
          is_active: isFirstConnection,
        });

      if (saveError) {
        if (saveError.code === '23505') {
          toast({
            title: "Duplicate Connection",
            description: "This API key is already connected",
            variant: "destructive",
          });
          return;
        }
        throw saveError;
      }

      toast({
        title: "Success",
        description: `"${newElevenLabsOrgName}" connected successfully`,
      });

      // Clear persisted state on successful submission
      clearNewElevenLabsApiKey();
      clearNewElevenLabsOrgName();
      setShowElevenLabsAddForm(false);
      await fetchElevenLabsConnections();
    } catch (error: any) {
      console.error('Error connecting ElevenLabs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect ElevenLabs",
        variant: "destructive",
      });
    } finally {
      setValidatingElevenLabs(false);
    }
  };

  const handleRemoveElevenLabsConnection = async (connectionId: string) => {
    const connection = elevenLabsConnections.find(c => c.id === connectionId);
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('elevenlabs_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      if (connection.is_active && elevenLabsConnections.length > 1) {
        const remaining = elevenLabsConnections.filter(c => c.id !== connectionId);
        if (remaining.length > 0) {
          await supabase
            .from('elevenlabs_connections')
            .update({ is_active: true })
            .eq('id', remaining[0].id);
        }
      }

      toast({
        title: "Success",
        description: `"${connection.org_name}" removed`,
      });

      await fetchElevenLabsConnections();
    } catch (error: any) {
      console.error('Error removing ElevenLabs connection:', error);
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive",
      });
    }
  };

  const handleAddOpenAIConnection = async () => {
    if (!newOpenAIApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (!newOpenAIOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name",
        variant: "destructive",
      });
      return;
    }

    setValidatingOpenAI(true);
    try {
      // For now, just save the API key. Validation will be added to backend later
      const isFirstConnection = openAIConnections.length === 0;

      const { error } = await supabase
        .from('openai_connections')
        .insert({
          user_id: user?.id,
          api_key: newOpenAIApiKey.trim(),
          org_name: newOpenAIOrgName.trim(),
          is_active: isFirstConnection,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Duplicate Connection",
            description: "This API key is already connected",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "OpenAI connected successfully",
      });

      // Clear persisted state on successful submission
      clearNewOpenAIApiKey();
      clearNewOpenAIOrgName();
      setShowOpenAIAddForm(false);
      await fetchOpenAIConnections();
    } catch (error: any) {
      console.error('Error connecting OpenAI:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect OpenAI",
        variant: "destructive",
      });
    } finally {
      setValidatingOpenAI(false);
    }
  };

  const handleRemoveOpenAIConnection = async (connectionId: string) => {
    const connection = openAIConnections.find(c => c.id === connectionId);
    if (!connection) return;

    try {
      const { error } = await supabase
        .from('openai_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      // If we removed the active connection and there are others, make the first one active
      if (connection.is_active && openAIConnections.length > 1) {
        const remaining = openAIConnections.filter(c => c.id !== connectionId);
        if (remaining.length > 0) {
          await supabase
            .from('openai_connections')
            .update({ is_active: true })
            .eq('id', remaining[0].id);
        }
      }

      toast({
        title: "Success",
        description: `"${connection.org_name}" removed`,
      });

      await fetchOpenAIConnections();
    } catch (error: any) {
      console.error('Error removing OpenAI connection:', error);
      toast({
        title: "Error",
        description: "Failed to remove connection",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = async () => {
    if (!user || !inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      toast({
        title: "Invite Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      
      setInviteEmail("");
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const [activeSection, setActiveSection] = useState("profile");

  const navItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "team", label: "Team", icon: Users },
    { id: "integrations", label: "Integrations", icon: Link2 },
  ];

  if (!user) {
    return <div>Please log in to view settings.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <div className="w-56 border-r bg-muted/30 p-4">
        <h1 className="text-lg font-semibold mb-4 px-2">Settings</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl p-6">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">Manage your account details</p>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Display Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email changes require confirmation from both old and new addresses.
                  </p>
                  <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Appearance</h2>
                <p className="text-sm text-muted-foreground">Customize the look and feel</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Light or dark mode</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4 mr-1" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4 mr-1" />
                      Dark
                    </Button>
                  </div>
                </div>
              </div>

              {/* Branding Settings */}
              <div className="pt-4">
                <BrandingSettings userId={user.id} />
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Notifications</h2>
                <p className="text-sm text-muted-foreground">Configure alerts and notifications</p>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      placeholder="notifications@example.com"
                      value={notificationPrefs.notification_email || user?.email || ''}
                      onChange={(e) =>
                        setNotificationPrefs(prev => ({ ...prev, notification_email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <Label htmlFor="chat-started">New chat started</Label>
                        <p className="text-xs text-muted-foreground">When users start conversations</p>
                      </div>
                      <Switch
                        id="chat-started"
                        checked={notificationPrefs.chat_started}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({ ...prev, chat_started: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <Label htmlFor="chat-ended">Chat ended</Label>
                        <p className="text-xs text-muted-foreground">When conversations complete</p>
                      </div>
                      <Switch
                        id="chat-ended"
                        checked={notificationPrefs.chat_ended}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({ ...prev, chat_ended: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <Label htmlFor="chat-error">Chat errors</Label>
                        <p className="text-xs text-muted-foreground">When errors occur</p>
                      </div>
                      <Switch
                        id="chat-error"
                        checked={notificationPrefs.chat_error}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs(prev => ({ ...prev, chat_error: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveNotifications} disabled={saving} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Security</h2>
                <p className="text-sm text-muted-foreground">Manage your password</p>
              </div>

              <div className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button onClick={handleChangePassword} disabled={saving} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          )}

          {/* Team Section */}
          {activeSection === "team" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Team</h2>
                <p className="text-sm text-muted-foreground">Manage team members</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Invite Member</Label>
                  <div className="flex gap-2 max-w-md">
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Button onClick={handleInviteMember} disabled={saving || !inviteEmail.trim()} size="sm">
                      Invite
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Label className="text-sm font-medium">Members</Label>
                  <div className="mt-2 border rounded-lg divide-y">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{profile?.full_name || "You"}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Owner</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Team management coming soon</p>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Section */}
          {activeSection === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Integrations</h2>
                <p className="text-sm text-muted-foreground">Connect external services</p>
              </div>

              {/* VAPI Voice */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">VAPI Voice</p>
                      <p className="text-xs text-muted-foreground">Voice assistants</p>
                    </div>
                  </div>
                  {voiceConnections.length > 0 && !showAddForm && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  {voiceConnections.length === 0 && !showAddForm ? (
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Connect VAPI
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {voiceConnections.map((connection) => (
                        <div key={connection.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{connection.org_name || 'Unnamed'}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveConnection(connection.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {showAddForm && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              placeholder="Organization name"
                              value={newOrgName}
                              onChange={(e) => setNewOrgName(e.target.value)}
                            />
                            <Input
                              type="password"
                              placeholder="Private API key"
                              value={newVoiceApiKey}
                              onChange={(e) => setNewVoiceApiKey(e.target.value)}
                            />
                          </div>
                          <Input
                            placeholder="Public key (optional)"
                            value={newVoicePublicKey}
                            onChange={(e) => setNewVoicePublicKey(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowAddForm(false);
                                clearNewVoiceApiKey();
                                clearNewVoicePublicKey();
                                clearNewOrgName();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddVoiceConnection}
                              disabled={validatingVoice || !newVoiceApiKey.trim() || !newOrgName.trim()}
                            >
                              {validatingVoice ? "Validating..." : "Connect"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ElevenLabs */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">ElevenLabs</p>
                      <p className="text-xs text-muted-foreground">WhatsApp agents</p>
                    </div>
                  </div>
                  {elevenLabsConnections.length > 0 && !showElevenLabsAddForm && (
                    <Button variant="outline" size="sm" onClick={() => setShowElevenLabsAddForm(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  {elevenLabsConnections.length === 0 && !showElevenLabsAddForm ? (
                    <Button variant="outline" size="sm" onClick={() => setShowElevenLabsAddForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Connect ElevenLabs
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {elevenLabsConnections.map((connection) => (
                        <div key={connection.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{connection.org_name || 'Unnamed'}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveElevenLabsConnection(connection.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {showElevenLabsAddForm && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              placeholder="Connection name"
                              value={newElevenLabsOrgName}
                              onChange={(e) => setNewElevenLabsOrgName(e.target.value)}
                            />
                            <Input
                              type="password"
                              placeholder="API key"
                              value={newElevenLabsApiKey}
                              onChange={(e) => setNewElevenLabsApiKey(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowElevenLabsAddForm(false);
                                clearNewElevenLabsApiKey();
                                clearNewElevenLabsOrgName();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddElevenLabsConnection}
                              disabled={validatingElevenLabs || !newElevenLabsApiKey.trim() || !newElevenLabsOrgName.trim()}
                            >
                              {validatingElevenLabs ? "Validating..." : "Connect"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OpenAI */}
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">OpenAI</p>
                      <p className="text-xs text-muted-foreground">Chatbots & AI features</p>
                    </div>
                  </div>
                  {openAIConnections.length > 0 && !showOpenAIAddForm && (
                    <Button variant="outline" size="sm" onClick={() => setShowOpenAIAddForm(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  {openAIConnections.length === 0 && !showOpenAIAddForm ? (
                    <Button variant="outline" size="sm" onClick={() => setShowOpenAIAddForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Connect OpenAI
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      {openAIConnections.map((connection) => (
                        <div key={connection.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{connection.org_name}</span>
                            {connection.is_active && (
                              <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">Active</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOpenAIConnection(connection.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      {showOpenAIAddForm && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              placeholder="Organization name"
                              value={newOpenAIOrgName}
                              onChange={(e) => setNewOpenAIOrgName(e.target.value)}
                            />
                            <Input
                              type="password"
                              placeholder="sk-proj-..."
                              value={newOpenAIApiKey}
                              onChange={(e) => setNewOpenAIApiKey(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowOpenAIAddForm(false);
                                clearNewOpenAIApiKey();
                                clearNewOpenAIOrgName();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddOpenAIConnection}
                              disabled={validatingOpenAI || !newOpenAIApiKey.trim() || !newOpenAIOrgName.trim()}
                            >
                              {validatingOpenAI ? "Connecting..." : "Connect"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Settings;
