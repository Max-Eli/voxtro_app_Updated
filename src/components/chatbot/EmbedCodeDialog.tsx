import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface EmbedCodeDialogProps {
  chatbotId: string;
  chatbotName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbedCodeDialog({ chatbotId, chatbotName, open, onOpenChange }: EmbedCodeDialogProps) {
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);
  const [copiedCSP, setCopiedCSP] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://voxtro-backend.onrender.com';
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'https://voxtro.ai';

  const widgetCode = `<!-- Voxtro Chatbot Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${apiBaseUrl}/api/widget/${chatbotId}/script.js?v=' + Date.now();
    script.async = true;
    script.onerror = function() {
      console.error('Failed to load Voxtro widget. Check your CSP settings.');
    };
    document.head.appendChild(script);
  })();
</script>`;

  const inlineCode = `<!-- Voxtro Chatbot (Inline - no CSP issues) -->
<iframe
  src="${frontendUrl}/messenger/${chatbotId}"
  style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; border: none; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 999999;"
  title="${chatbotName}"
></iframe>`;

  const cspDirective = `script-src 'self' 'unsafe-inline' ${apiBaseUrl};
frame-src 'self' ${frontendUrl};
connect-src 'self' ${apiBaseUrl} https://*.supabase.co;`;

  const copyCode = (code: string, type: 'widget' | 'inline' | 'csp') => {
    navigator.clipboard.writeText(code);

    if (type === 'widget') {
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 2000);
    } else if (type === 'inline') {
      setCopiedInline(true);
      setTimeout(() => setCopiedInline(false), 2000);
    } else {
      setCopiedCSP(true);
      setTimeout(() => setCopiedCSP(false), 2000);
    }

    toast.success("Copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed {chatbotName}</DialogTitle>
          <DialogDescription>
            Choose the best embedding method for your website
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="inline" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inline">Iframe (Recommended)</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
          </TabsList>

          <TabsContent value="inline" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Works everywhere with no configuration.</strong> Uses an iframe - compatible with all websites, even those with strict security policies.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Iframe Embed Code</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyCode(inlineCode, 'inline')}
                >
                  {copiedInline ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedInline ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>{inlineCode}</code>
              </pre>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Pros & Cons:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-green-600 mb-2">✓ Pros</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Works on ALL websites</li>
                    <li>No security configuration needed</li>
                    <li>No CSP issues</li>
                    <li>Simple implementation</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-orange-600 mb-2">✗ Cons</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Always visible (no toggle button)</li>
                    <li>Fixed position and size</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">How to Install:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Copy the iframe embed code above</li>
                <li>Paste it into your website's HTML, just before the closing <code>&lt;/body&gt;</code> tag</li>
                <li>Adjust the <code>style</code> attribute to change position or size if needed</li>
                <li>Save and publish your website</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="widget" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Floating chat button.</strong> Opens a chat window when clicked. May require CSP configuration on some websites.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Widget Code</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyCode(widgetCode, 'widget')}
                >
                  {copiedWidget ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedWidget ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>{widgetCode}</code>
              </pre>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> If you see a CSP error in the browser console, your website has a Content Security Policy that needs to be updated.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">CSP Configuration (if needed)</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyCode(cspDirective, 'csp')}
                >
                  {copiedCSP ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCSP ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                <code>{cspDirective}</code>
              </pre>
              <p className="text-xs text-muted-foreground">
                Add these directives to your website's Content-Security-Policy header or meta tag.
                Contact your developer or hosting provider if you need help with this.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">How to Install:</h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Copy the widget code above</li>
                <li>Paste it into your website's HTML, just before the closing <code>&lt;/body&gt;</code> tag</li>
                <li>Test on your website</li>
                <li>If you see CSP errors, add the CSP configuration (or use iframe method instead)</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Troubleshooting</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>If you see a CSP error: Use the <strong>iframe method</strong> instead (works everywhere)</li>
            <li>If the chatbot doesn't appear: Clear your browser cache and refresh</li>
            <li>For WordPress, Wix, or Squarespace: Paste the code in your custom HTML or embed block</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
