import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paintbrush, Upload, Save, Trash2, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BrandingSettingsData {
  id?: string;
  user_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface BrandingSettingsProps {
  userId: string;
}

export function BrandingSettings({ userId }: BrandingSettingsProps) {
  const [branding, setBranding] = useState<BrandingSettingsData>({
    user_id: userId,
    logo_url: null,
    primary_color: "#f97316",
    secondary_color: "#ea580c",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBranding();
  }, [userId]);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setBranding({
          id: data.id,
          user_id: data.user_id,
          logo_url: data.logo_url,
          primary_color: data.primary_color || "#f97316",
          secondary_color: data.secondary_color || "#ea580c",
        });
      }
    } catch (error: any) {
      console.error('Error fetching branding:', error);
      toast({
        title: "Error",
        description: "Failed to load branding settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPEG, SVG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/logo.${fileExt}`;

      // Delete existing logo if any
      await supabase.storage.from('logos').remove([`${userId}/logo.png`, `${userId}/logo.jpg`, `${userId}/logo.svg`, `${userId}/logo.webp`]);

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setBranding(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!branding.logo_url) return;

    try {
      // Remove all possible logo files for this user
      await supabase.storage.from('logos').remove([
        `${userId}/logo.png`,
        `${userId}/logo.jpg`,
        `${userId}/logo.svg`,
        `${userId}/logo.webp`,
      ]);

      setBranding(prev => ({ ...prev, logo_url: null }));
      
      toast({
        title: "Logo removed",
        description: "Your logo has been removed",
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandingData = {
        user_id: userId,
        logo_url: branding.logo_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
      };

      if (branding.id) {
        const { error } = await supabase
          .from('branding_settings')
          .update(brandingData)
          .eq('id', branding.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('branding_settings')
          .insert(brandingData)
          .select()
          .single();

        if (error) throw error;
        setBranding(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Success",
        description: "Branding settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving branding:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-primary" />
            <CardTitle>Customer Portal Branding</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading branding settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-primary" />
          <CardTitle>Customer Portal Branding</CardTitle>
        </div>
        <CardDescription>
          Customize the appearance of the customer portal with your brand colors and logo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {branding.logo_url ? (
                  <img 
                    src={branding.logo_url} 
                    alt="Company logo" 
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                {branding.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPEG, SVG or WebP. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    id="primary-color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                    style={{ padding: 0 }}
                  />
                </div>
                <Input
                  value={branding.primary_color}
                  onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#f97316"
                  className="w-28 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons, links, and accents
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    id="secondary-color"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                    style={{ padding: 0 }}
                  />
                </div>
                <Input
                  value={branding.secondary_color}
                  onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                  placeholder="#ea580c"
                  className="w-28 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for hover states and secondary elements
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label>Preview</Label>
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-4 mb-4">
                {branding.logo_url ? (
                  <img 
                    src={branding.logo_url} 
                    alt="Preview logo" 
                    className="h-8 object-contain"
                  />
                ) : (
                  <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    Your Logo
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-md text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: branding.primary_color }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = branding.secondary_color}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = branding.primary_color}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
                  style={{ 
                    color: branding.primary_color, 
                    borderColor: branding.primary_color,
                  }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Branding Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
