import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Package, Receipt, Zap } from "lucide-react";

const Billing = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in to view billing information.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <Badge variant="default">Free Tier</Badge>
            </div>
            <CardDescription>
              You are currently on the free tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Monthly message limit</span>
                <span className="font-medium">1,000 messages</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chatbots</span>
                <span className="font-medium">Up to 3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Analytics</span>
                <span className="font-medium">Basic</span>
              </div>
              <Button className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <CardTitle>Payment Method</CardTitle>
              </div>
              <CardDescription>
                Manage your payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No payment method on file</p>
              <Button variant="outline" className="w-full mt-4">
                Add Payment Method
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <CardTitle>Billing History</CardTitle>
              </div>
              <CardDescription>
                View your past invoices and receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No billing history available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;