
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Settings } from "lucide-react";

interface EmailPreferences {
  order_confirmations: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  newsletter: boolean;
}

export const EmailPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    order_confirmations: true,
    order_updates: true,
    marketing_emails: true,
    newsletter: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          order_confirmations: data.order_confirmations,
          order_updates: data.order_updates,
          marketing_emails: data.marketing_emails,
          newsletter: data.newsletter,
        });
      }
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      toast.error('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: EmailPreferences) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: user?.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Email preferences updated successfully');
    } catch (error) {
      console.error('Error updating email preferences:', error);
      toast.error('Failed to update email preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof EmailPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    updatePreferences(newPreferences);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Preferences
        </CardTitle>
        <CardDescription>
          Manage your email notifications and communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Order Confirmations</label>
              <p className="text-xs text-muted-foreground">
                Receive emails when your orders are confirmed
              </p>
            </div>
            <Switch
              checked={preferences.order_confirmations}
              onCheckedChange={(checked) => handlePreferenceChange('order_confirmations', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Order Updates</label>
              <p className="text-xs text-muted-foreground">
                Get notified about shipping and delivery status
              </p>
            </div>
            <Switch
              checked={preferences.order_updates}
              onCheckedChange={(checked) => handlePreferenceChange('order_updates', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Marketing Emails</label>
              <p className="text-xs text-muted-foreground">
                Receive promotional offers and product recommendations
              </p>
            </div>
            <Switch
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => handlePreferenceChange('marketing_emails', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Newsletter</label>
              <p className="text-xs text-muted-foreground">
                Subscribe to our weekly newsletter with tips and updates
              </p>
            </div>
            <Switch
              checked={preferences.newsletter}
              onCheckedChange={(checked) => handlePreferenceChange('newsletter', checked)}
              disabled={saving}
            />
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="h-4 w-4 animate-spin" />
            Saving preferences...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
