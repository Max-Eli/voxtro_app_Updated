/**
 * Custom Domain Settings Component
 *
 * Allows business admins to configure a custom domain for their customer portal.
 * e.g., portal.mybusiness.com instead of voxtro.io/customer-dashboard
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Globe, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, Trash2 } from "lucide-react";
import { getMyCustomDomain, addCustomDomain, verifyCustomDomain, removeCustomDomain, CustomDomain } from "@/integrations/api/endpoints/domains";

interface CustomDomainSettingsProps {
  className?: string;
}

export function CustomDomainSettings({ className }: CustomDomainSettingsProps) {
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchDomain = async () => {
    try {
      setLoading(true);
      const result = await getMyCustomDomain();
      setDomain(result);
    } catch (error) {
      console.error("Error fetching custom domain:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomain();
  }, []);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a domain",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    const cleanDomain = newDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domainRegex.test(cleanDomain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain (e.g., portal.mybusiness.com)",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await addCustomDomain(cleanDomain);
      setDomain(result);
      setNewDomain("");
      toast({
        title: "Domain Added",
        description: "Now configure your DNS records to complete setup.",
      });
    } catch (error: any) {
      console.error("Error adding domain:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    try {
      const result = await verifyCustomDomain();
      if (result.status === "verified") {
        toast({
          title: "Domain Verified!",
          description: "Your custom domain is now active.",
        });
        await fetchDomain();
      } else {
        toast({
          title: "Verification Pending",
          description: result.message || "DNS records not yet propagated. This can take up to 48 hours.",
        });
      }
    } catch (error: any) {
      console.error("Error verifying domain:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify domain",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm("Are you sure you want to remove your custom domain?")) {
      return;
    }

    setRemoving(true);
    try {
      await removeCustomDomain();
      setDomain(null);
      toast({
        title: "Domain Removed",
        description: "Your custom domain has been removed.",
      });
    } catch (error: any) {
      console.error("Error removing domain:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove domain",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
          <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Custom Domain</p>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-sm">Custom Domain</p>
            <p className="text-xs text-muted-foreground">Customer portal domain</p>
          </div>
        </div>
        {domain && (
          <div className="flex items-center gap-2">
            {domain.verification_status === "verified" ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                <Loader2 className="w-3 h-3" />
                Pending
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!domain ? (
          // No domain configured - show add form
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a custom domain for your customer portal. Your customers will access their portal at this domain instead of voxtro.io.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="portal.yourbusiness.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddDomain}
                disabled={saving || !newDomain.trim()}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Domain"
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Domain configured - show status and actions
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Your Domain</Label>
                <p className="text-lg font-mono mt-1">{domain.domain}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDomain}
                disabled={removing}
                className="text-destructive hover:text-destructive"
              >
                {removing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            {domain.verification_status !== "verified" && (
              <>
                {/* DNS Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">DNS Configuration Required</p>
                  <p className="text-xs text-muted-foreground">
                    Add the following CNAME record to your DNS provider:
                  </p>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between bg-background rounded px-3 py-2 border">
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-mono">CNAME</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded px-3 py-2 border">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-mono">{domain.domain.split('.')[0]}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(domain.domain.split('.')[0])}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between bg-background rounded px-3 py-2 border">
                      <div>
                        <span className="text-muted-foreground">Value: </span>
                        <span className="font-mono">{domain.cname_target}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(domain.cname_target)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    DNS changes can take up to 48 hours to propagate worldwide.
                  </p>
                </div>

                <Button
                  onClick={handleVerifyDomain}
                  disabled={verifying}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify Domain
                    </>
                  )}
                </Button>
              </>
            )}

            {domain.verification_status === "verified" && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Your custom domain is active!
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Customers can now access their portal at:
                </p>
                <a
                  href={`https://${domain.domain}/customer-login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-mono text-green-700 dark:text-green-400 hover:underline"
                >
                  https://{domain.domain}/customer-login
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
