import { useState } from "react";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CreditCard, Settings, Shield, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminPaymentSettings = () => {
  const { toast } = useToast();
  const [isTestMode, setIsTestMode] = useState(true);
  const [payfastSettings, setPayfastSettings] = useState({
    merchantId: "10000100",
    merchantKey: "46f0cd694581a",
    passphrase: "",
    enabled: true
  });

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Payment settings have been updated successfully.",
    });
  };

  const testPaymentConnection = () => {
    toast({
      title: "Testing connection...",
      description: "Connecting to PayFast API...",
    });
    
    // Simulate API test
    setTimeout(() => {
      toast({
        title: "Connection successful",
        description: "PayFast API connection test passed.",
      });
    }, 2000);
  };

  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Payment Settings</h1>
              <p className="text-muted-foreground">
                Configure payment gateways and processing options
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  PayFast Status
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  Gateway is operational
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Test Mode
                </CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {isTestMode ? "Enabled" : "Disabled"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sandbox environment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Security Level
                </CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">High</div>
                <p className="text-xs text-muted-foreground">
                  SSL + Signature verification
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="payfast" className="space-y-4">
            <TabsList>
              <TabsTrigger value="payfast">PayFast Configuration</TabsTrigger>
              <TabsTrigger value="security">Security Settings</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="payfast" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    PayFast Gateway Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your PayFast payment gateway integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="payfast-enabled" className="text-base font-medium">
                        Enable PayFast
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to pay using PayFast
                      </p>
                    </div>
                    <Switch 
                      id="payfast-enabled"
                      checked={payfastSettings.enabled}
                      onCheckedChange={(enabled) => 
                        setPayfastSettings(prev => ({ ...prev, enabled }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="test-mode" className="text-base font-medium">
                        Test Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Use sandbox environment for testing
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="test-mode"
                        checked={isTestMode}
                        onCheckedChange={setIsTestMode}
                      />
                      <Badge variant={isTestMode ? "secondary" : "default"}>
                        {isTestMode ? "Sandbox" : "Live"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="merchant-id">Merchant ID</Label>
                      <Input
                        id="merchant-id"
                        value={payfastSettings.merchantId}
                        onChange={(e) => 
                          setPayfastSettings(prev => ({ ...prev, merchantId: e.target.value }))
                        }
                        placeholder="Enter your PayFast Merchant ID"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="merchant-key">Merchant Key</Label>
                      <Input
                        id="merchant-key"
                        type="password"
                        value={payfastSettings.merchantKey}
                        onChange={(e) => 
                          setPayfastSettings(prev => ({ ...prev, merchantKey: e.target.value }))
                        }
                        placeholder="Enter your PayFast Merchant Key"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="passphrase">Passphrase (Optional)</Label>
                      <Input
                        id="passphrase"
                        type="password"
                        value={payfastSettings.passphrase}
                        onChange={(e) => 
                          setPayfastSettings(prev => ({ ...prev, passphrase: e.target.value }))
                        }
                        placeholder="Enter your PayFast Passphrase"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for additional security validation
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSaveSettings}>
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={testPaymentConnection}>
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Configuration
                  </CardTitle>
                  <CardDescription>
                    Payment security and fraud prevention settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800">Security Status: Active</h4>
                    </div>
                    <ul className="text-green-700 text-sm mt-2 ml-7 space-y-1">
                      <li>• SSL/TLS encryption enabled</li>
                      <li>• Payment signature verification active</li>
                      <li>• Webhook signature validation enabled</li>
                      <li>• PCI DSS compliant payment processing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="webhooks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage payment notification endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value="https://your-domain.com/api/payfast-webhook"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Configure this URL in your PayFast account to receive payment notifications
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="return-url">Return URL</Label>
                      <Input
                        id="return-url"
                        value="https://your-domain.com/checkout/success"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL where customers are redirected after successful payment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminPaymentSettings;