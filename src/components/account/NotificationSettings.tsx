import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Bell, Loader2 } from 'lucide-react';

interface EmailPreferences {
  id?: string;
  order_confirmations: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  newsletter: boolean;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    order_confirmations: true,
    order_updates: true,
    marketing_emails: true,
    newsletter: false,
  });

  const { data: existingPrefs, isLoading } = useQuery({
    queryKey: ['email-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as EmailPreferences | null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (existingPrefs) {
      setPreferences(existingPrefs);
    }
  }, [existingPrefs]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: EmailPreferences) => {
      if (existingPrefs?.id) {
        const { error } = await supabase
          .from('email_preferences')
          .update({
            order_confirmations: prefs.order_confirmations,
            order_updates: prefs.order_updates,
            marketing_emails: prefs.marketing_emails,
            newsletter: prefs.newsletter,
          })
          .eq('id', existingPrefs.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_preferences')
          .insert({
            user_id: user?.id,
            ...prefs,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      toast.success('Preferences saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save preferences');
    },
  });

  const handleToggle = (key: keyof EmailPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose what emails you'd like to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order_confirmations" className="font-medium">
                Order Confirmations
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive confirmation when you place an order
              </p>
            </div>
            <Switch
              id="order_confirmations"
              checked={preferences.order_confirmations}
              onCheckedChange={() => handleToggle('order_confirmations')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order_updates" className="font-medium">
                Order Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about shipping and delivery updates
              </p>
            </div>
            <Switch
              id="order_updates"
              checked={preferences.order_updates}
              onCheckedChange={() => handleToggle('order_updates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing_emails" className="font-medium">
                Promotions & Sales
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive exclusive deals and special offers
              </p>
            </div>
            <Switch
              id="marketing_emails"
              checked={preferences.marketing_emails}
              onCheckedChange={() => handleToggle('marketing_emails')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="newsletter" className="font-medium">
                Newsletter
              </Label>
              <p className="text-sm text-muted-foreground">
                Weekly updates about new products and trends
              </p>
            </div>
            <Switch
              id="newsletter"
              checked={preferences.newsletter}
              onCheckedChange={() => handleToggle('newsletter')}
            />
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate(preferences)}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
