import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, User, Bell, Shield, Save, Users, Bot, Plus, Trash2, MessageCircle, Sun, Moon, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BrandingSettings } from "@/components/BrandingSettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/ThemeProvider";
import { validateVoiceConnection, validateElevenLabsConnection } from "@/integrations/api/endpoints";

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
  const [newVoiceApiKey, setNewVoiceApiKey] = useState("");
  const [newVoicePublicKey, setNewVoicePublicKey] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [validatingVoice, setValidatingVoice] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // ElevenLabs connection state
  const [elevenLabsConnections, setElevenLabsConnections] = useState<ElevenLabsConnection[]>([]);
  const [newElevenLabsApiKey, setNewElevenLabsApiKey] = useState("");
  const [newElevenLabsOrgName, setNewElevenLabsOrgName] = useState("");
  const [validatingElevenLabs, setValidatingElevenLabs] = useState(false);
  const [showElevenLabsAddForm, setShowElevenLabsAddForm] = useState(false);

  // OpenAI connection state
  const [openAIConnections, setOpenAIConnections] = useState<OpenAIConnection[]>([]);
  const [newOpenAIApiKey, setNewOpenAIApiKey] = useState("");
  const [newOpenAIOrgName, setNewOpenAIOrgName] = useState("");
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
    if (!user) return;

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

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

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

      setNewVoiceApiKey("");
      setNewVoicePublicKey("");
      setNewOrgName("");
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

      setNewElevenLabsApiKey("");
      setNewElevenLabsOrgName("");
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

      setNewOpenAIApiKey("");
      setNewOpenAIOrgName("");
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

  if (!user) {
    return <div>Please log in to view settings.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Changing your email will require confirmation from both your old and new email addresses
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Display Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your display name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed in the header
                  </p>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {user && <BrandingSettings userId={user.id} />}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading preferences...</p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">Notification Email</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      placeholder="Enter email address for notifications"
                      value={notificationPrefs.notification_email || user?.email || ''}
                      onChange={(e) =>
                        setNotificationPrefs(prev => ({ ...prev, notification_email: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Email address where notifications will be sent. Defaults to your account email.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chat-started">New chat started</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a user starts a new conversation with your chatbot
                      </p>
                    </div>
                    <Switch
                      id="chat-started"
                      checked={notificationPrefs.chat_started}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs(prev => ({ ...prev, chat_started: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chat-ended">Chat ended</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a conversation with your chatbot ends
                      </p>
                    </div>
                    <Switch
                      id="chat-ended"
                      checked={notificationPrefs.chat_ended}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs(prev => ({ ...prev, chat_ended: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chat-error">Chat errors</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when there's an error in your chatbot conversations
                      </p>
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

                <Button 
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Notification Preferences"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Manage your password and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Members</CardTitle>
            </div>
            <CardDescription>
              Manage team members and access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Invite New Member</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="Enter email address to invite"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleInviteMember}
                    disabled={saving || !inviteEmail.trim()}
                  >
                    {saving ? "Sending..." : "Invite"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send an invitation to add a new team member to your account
                </p>
              </div>

              <div className="space-y-2">
                <Label>Current Members</Label>
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                <p className="text-xs text-muted-foreground">
                  Team member management coming soon
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle>Voice Organizations</CardTitle>
              </div>
              {voiceConnections.length > 0 && !showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Organization
                </Button>
              )}
            </div>
            <CardDescription>
              Connect multiple Vapi organizations and switch between them
            </CardDescription>
          </CardHeader>
          <CardContent>
            {voiceConnections.length === 0 && !showAddForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No voice organizations connected. Add your first Vapi organization to get started.
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Organization
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Connected Organizations List */}
                {voiceConnections.length > 0 && (
                  <div className="space-y-3">
                    <Label>Connected Organizations</Label>
                    <ScrollArea className={voiceConnections.length > 3 ? "h-[280px]" : ""}>
                      <div className="space-y-3 pr-4">
                        {voiceConnections.map((connection) => (
                          <div
                            key={connection.id}
                            className="p-4 border rounded-lg border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium">{connection.org_name || 'Unnamed Organization'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveConnection(connection.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {/* Public Key Management for each org */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Public Key (for Web SDK)</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="Enter public key for browser testing"
                                  defaultValue={connection.public_key || ''}
                                  className="text-sm"
                                  onBlur={(e) => {
                                    if (e.target.value !== (connection.public_key || '')) {
                                      handleUpdatePublicKey(connection.id, e.target.value);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Add New Organization Form */}
                {showAddForm && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Add New Organization</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewVoiceApiKey("");
                          setNewVoicePublicKey("");
                          setNewOrgName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-org-name">Organization Name</Label>
                      <Input
                        id="new-org-name"
                        type="text"
                        placeholder="e.g., My Company Production"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        A friendly name to identify this organization
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-voice-api-key">Private API Key</Label>
                      <Input
                        id="new-voice-api-key"
                        type="password"
                        placeholder="Enter your Vapi private API key"
                        value={newVoiceApiKey}
                        onChange={(e) => setNewVoiceApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Vapi private API key for server-side operations
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-voice-public-key">Public Key (Optional)</Label>
                      <Input
                        id="new-voice-public-key"
                        type="text"
                        placeholder="Enter your Vapi public key"
                        value={newVoicePublicKey}
                        onChange={(e) => setNewVoicePublicKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add your public key to enable testing voice assistants in the browser
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleAddVoiceConnection}
                      disabled={validatingVoice || !newVoiceApiKey.trim() || !newOrgName.trim()}
                      className="w-full"
                    >
                      {validatingVoice ? "Validating..." : "Connect Organization"}
                    </Button>
                  </div>
                )}

                {voiceConnections.length > 0 && !showAddForm && (
                  <p className="text-xs text-muted-foreground">
                    Switch between organizations on the Voice Assistants or Changelog pages.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <CardTitle>ElevenLabs Connection</CardTitle>
              </div>
              {elevenLabsConnections.length > 0 && !showElevenLabsAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowElevenLabsAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              )}
            </div>
            <CardDescription>
              Connect your ElevenLabs account to manage WhatsApp agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {elevenLabsConnections.length === 0 && !showElevenLabsAddForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No ElevenLabs account connected. Add your API key to get started with WhatsApp agents.
                </p>
                <Button onClick={() => setShowElevenLabsAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {elevenLabsConnections.length > 0 && (
                  <div className="space-y-3">
                    <Label>Connected Accounts</Label>
                    <ScrollArea className={elevenLabsConnections.length > 3 ? "h-[200px]" : ""}>
                      <div className="space-y-3 pr-4">
                        {elevenLabsConnections.map((connection) => (
                          <div
                            key={connection.id}
                            className="p-4 border rounded-lg border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{connection.org_name || 'Unnamed Connection'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveElevenLabsConnection(connection.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {showElevenLabsAddForm && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Add ElevenLabs Connection</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowElevenLabsAddForm(false);
                          setNewElevenLabsApiKey("");
                          setNewElevenLabsOrgName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-elevenlabs-org-name">Connection Name</Label>
                      <Input
                        id="new-elevenlabs-org-name"
                        type="text"
                        placeholder="e.g., My ElevenLabs Account"
                        value={newElevenLabsOrgName}
                        onChange={(e) => setNewElevenLabsOrgName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        A friendly name to identify this connection
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-elevenlabs-api-key">API Key</Label>
                      <Input
                        id="new-elevenlabs-api-key"
                        type="password"
                        placeholder="Enter your ElevenLabs API key"
                        value={newElevenLabsApiKey}
                        onChange={(e) => setNewElevenLabsApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Find your API key at elevenlabs.io/settings/api-keys
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleAddElevenLabsConnection}
                      disabled={validatingElevenLabs || !newElevenLabsApiKey.trim() || !newElevenLabsOrgName.trim()}
                      className="w-full"
                    >
                      {validatingElevenLabs ? "Validating..." : "Connect Account"}
                    </Button>
                  </div>
                )}

                {elevenLabsConnections.length > 0 && !showElevenLabsAddForm && (
                  <p className="text-xs text-muted-foreground">
                    View your WhatsApp agents on the WhatsApp Agents page.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle>OpenAI Connection</CardTitle>
              </div>
              {openAIConnections.length > 0 && !showOpenAIAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOpenAIAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              )}
            </div>
            <CardDescription>
              Connect your OpenAI API key to power chatbot conversations and AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openAIConnections.length === 0 && !showOpenAIAddForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No OpenAI account connected. Add your API key to enable chatbot creation and AI-powered features.
                </p>
                <Button onClick={() => setShowOpenAIAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add OpenAI API Key
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {openAIConnections.map((connection) => (
                  <Card key={connection.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{connection.org_name}</p>
                            {connection.is_active && (
                              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            API Key: {connection.api_key.substring(0, 7)}...{connection.api_key.substring(connection.api_key.length - 4)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOpenAIConnection(connection.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {showOpenAIAddForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Add OpenAI Connection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-openai-org-name">Organization Name</Label>
                        <Input
                          id="new-openai-org-name"
                          type="text"
                          placeholder="e.g., Main Account, Production, Testing"
                          value={newOpenAIOrgName}
                          onChange={(e) => setNewOpenAIOrgName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          A friendly name to identify this connection
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-openai-api-key">API Key</Label>
                        <Input
                          id="new-openai-api-key"
                          type="password"
                          placeholder="sk-proj-..."
                          value={newOpenAIApiKey}
                          onChange={(e) => setNewOpenAIApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Find your API key at platform.openai.com/api-keys
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowOpenAIAddForm(false);
                            setNewOpenAIApiKey("");
                            setNewOpenAIOrgName("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddOpenAIConnection}
                          disabled={validatingOpenAI || !newOpenAIApiKey.trim() || !newOpenAIOrgName.trim()}
                          className="flex-1"
                        >
                          {validatingOpenAI ? "Connecting..." : "Connect OpenAI"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {openAIConnections.length > 0 && !showOpenAIAddForm && (
                  <p className="text-xs text-muted-foreground">
                    This API key will be used for chatbot conversations, website crawling, and AI-powered features.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
