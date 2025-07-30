import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Save, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PayFastSettings {
  merchant_id: string;
  merchant_key: string;
  passphrase: string;
  mode: 'sandbox' | 'production';
  is_active: boolean;
}

export const PayFastConfig = () => {
  const [settings, setSettings] = useState<PayFastSettings>({
    merchant_id: '',
    merchant_key: '',
    passphrase: '',
    mode: 'sandbox',
    is_active: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      // Get PayFast settings from Supabase functions secrets
      const { data: response, error } = await supabase.functions.invoke('get-payfast-config');
      
      if (error) {
        console.error('Error fetching PayFast config:', error);
        // Set default values if no config exists
        setSettings({
          merchant_id: '',
          merchant_key: '',
          passphrase: '',
          mode: 'sandbox',
          is_active: false
        });
      } else {
        setSettings(response || {
          merchant_id: '',
          merchant_key: '',
          passphrase: '',
          mode: 'sandbox',
          is_active: false
        });
      }
    } catch (error) {
      console.error('Error fetching PayFast settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('update-payfast-config', {
        body: settings
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PayFast configuration updated successfully",
      });

    } catch (error) {
      console.error("Error updating PayFast config:", error);
      toast({
        title: "Error",
        description: "Failed to update PayFast configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (field: keyof PayFastSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="text-center py-4">Loading PayFast configuration...</div>;
  }

  const isConfigured = settings.merchant_id && settings.merchant_key;
  const sandboxUrl = "https://sandbox.payfast.io/eng/process";
  const productionUrl = "https://www.payfast.co.za/eng/process";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">PayFast Configuration</h2>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          PayFast is a South African payment gateway. Use sandbox mode for testing with payfast.io, 
          then switch to production mode when ready to go live.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>PayFast Settings</span>
            <div className="flex items-center gap-2">
              <Badge variant={settings.is_active ? "default" : "secondary"}>
                {settings.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={settings.mode === 'production' ? "destructive" : "outline"}>
                {settings.mode === 'production' ? "Production" : "Sandbox"}
              </Badge>
              {isConfigured && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="merchant_id">Merchant ID</Label>
              <Input
                id="merchant_id"
                value={settings.merchant_id}
                onChange={(e) => updateSetting('merchant_id', e.target.value)}
                placeholder={settings.mode === 'sandbox' ? "10000100" : "Your PayFast Merchant ID"}
              />
              <p className="text-xs text-muted-foreground">
                {settings.mode === 'sandbox' 
                  ? "Use 10000100 for sandbox testing" 
                  : "Your production merchant ID from PayFast"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant_key">Merchant Key</Label>
              <Input
                id="merchant_key"
                value={settings.merchant_key}
                onChange={(e) => updateSetting('merchant_key', e.target.value)}
                placeholder={settings.mode === 'sandbox' ? "46f0cd694581a" : "Your PayFast Merchant Key"}
                type="password"
              />
              <p className="text-xs text-muted-foreground">
                {settings.mode === 'sandbox' 
                  ? "Use 46f0cd694581a for sandbox testing" 
                  : "Your production merchant key from PayFast"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase (Optional)</Label>
            <Input
              id="passphrase"
              value={settings.passphrase}
              onChange={(e) => updateSetting('passphrase', e.target.value)}
              placeholder="Optional passphrase for additional security"
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Optional passphrase for enhanced security. Required for production mode.
            </p>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="mode"
                checked={settings.mode === 'production'}
                onCheckedChange={(checked) => updateSetting('mode', checked ? 'production' : 'sandbox')}
              />
              <Label htmlFor="mode">Production Mode</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={settings.is_active}
                onCheckedChange={(checked) => updateSetting('is_active', checked)}
              />
              <Label htmlFor="active">Enable PayFast</Label>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">Current Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Processing URL:</span>
                <p className="text-muted-foreground break-all">
                  {settings.mode === 'production' ? productionUrl : sandboxUrl}
                </p>
              </div>
              <div>
                <span className="font-medium">Test Cards (Sandbox):</span>
                <p className="text-muted-foreground">
                  Use PayFast test cards for sandbox payments
                </p>
              </div>
            </div>
          </div>

          {settings.mode === 'production' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Production Mode Warning:</strong> You are in production mode. 
                Real transactions will be processed and money will be transferred.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleSave}
              disabled={saving || !settings.merchant_id || !settings.merchant_key}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Sandbox Testing (payfast.io)</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Use Merchant ID: <code>10000100</code></li>
              <li>Use Merchant Key: <code>46f0cd694581a</code></li>
              <li>Test with PayFast provided test card numbers</li>
              <li>All transactions are simulated - no real money is processed</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Production Setup</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Create a PayFast merchant account at payfast.co.za</li>
              <li>Get your production Merchant ID and Merchant Key</li>
              <li>Set a secure passphrase (recommended)</li>
              <li>Switch to Production Mode</li>
              <li>Test with small amounts before going live</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};