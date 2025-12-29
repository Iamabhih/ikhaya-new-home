import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, Mail, Clock, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AbandonedCartSettings {
  id: string;
  is_enabled: boolean;
  first_email_delay_hours: number;
  second_email_delay_hours: number;
  third_email_delay_hours: number;
  email_subject_first: string;
  email_subject_second: string;
  email_subject_third: string;
  offer_discount_on_second: boolean;
  discount_percentage: number;
}

export const AbandonedCartSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AbandonedCartSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['abandoned-cart-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abandoned_cart_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AbandonedCartSettings | null;
    },
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    } else {
      // Default settings
      setSettings({
        id: '',
        is_enabled: true,
        first_email_delay_hours: 1,
        second_email_delay_hours: 24,
        third_email_delay_hours: 72,
        email_subject_first: 'You left something behind!',
        email_subject_second: 'Still thinking about it? Here\'s 10% off!',
        email_subject_third: 'Last chance to complete your order',
        offer_discount_on_second: true,
        discount_percentage: 10,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings) return;

      const payload = {
        is_enabled: settings.is_enabled,
        first_email_delay_hours: settings.first_email_delay_hours,
        second_email_delay_hours: settings.second_email_delay_hours,
        third_email_delay_hours: settings.third_email_delay_hours,
        email_subject_first: settings.email_subject_first,
        email_subject_second: settings.email_subject_second,
        email_subject_third: settings.email_subject_third,
        offer_discount_on_second: settings.offer_discount_on_second,
        discount_percentage: settings.discount_percentage,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('abandoned_cart_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('abandoned_cart_settings')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned-cart-settings'] });
      toast.success('Settings saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Abandoned Cart Recovery</h2>
          <p className="text-muted-foreground">
            Configure automated email campaigns to recover abandoned carts
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Master Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enable Cart Recovery</CardTitle>
              <CardDescription>
                Turn on/off automated abandoned cart email campaigns
              </CardDescription>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, is_enabled: checked } : null)}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Email Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* First Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">First Email</CardTitle>
            </div>
            <CardDescription>Gentle reminder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Delay (hours)
              </Label>
              <Input
                type="number"
                min="1"
                value={settings.first_email_delay_hours}
                onChange={(e) => setSettings(prev => prev ? { ...prev, first_email_delay_hours: parseInt(e.target.value) || 1 } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={settings.email_subject_first}
                onChange={(e) => setSettings(prev => prev ? { ...prev, email_subject_first: e.target.value } : null)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Second Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Second Email</CardTitle>
            </div>
            <CardDescription>With optional discount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Delay (hours)
              </Label>
              <Input
                type="number"
                min="1"
                value={settings.second_email_delay_hours}
                onChange={(e) => setSettings(prev => prev ? { ...prev, second_email_delay_hours: parseInt(e.target.value) || 24 } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={settings.email_subject_second}
                onChange={(e) => setSettings(prev => prev ? { ...prev, email_subject_second: e.target.value } : null)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="offer-discount"
                checked={settings.offer_discount_on_second}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, offer_discount_on_second: checked } : null)}
              />
              <Label htmlFor="offer-discount">Include discount</Label>
            </div>
            {settings.offer_discount_on_second && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Discount %
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.discount_percentage}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, discount_percentage: parseInt(e.target.value) || 10 } : null)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Third Email */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">Third Email</CardTitle>
            </div>
            <CardDescription>Final reminder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Delay (hours)
              </Label>
              <Input
                type="number"
                min="1"
                value={settings.third_email_delay_hours}
                onChange={(e) => setSettings(prev => prev ? { ...prev, third_email_delay_hours: parseInt(e.target.value) || 72 } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={settings.email_subject_third}
                onChange={(e) => setSettings(prev => prev ? { ...prev, email_subject_third: e.target.value } : null)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Email Timeline Preview</CardTitle>
          <CardDescription>When emails will be sent after cart abandonment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 overflow-x-auto pb-4">
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="w-4 h-4 rounded-full bg-muted-foreground" />
              <div className="text-xs text-muted-foreground mt-1">Cart Abandoned</div>
            </div>
            <div className="flex-1 h-0.5 bg-border min-w-[40px]" />
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <div className="text-xs font-medium mt-1">{settings.first_email_delay_hours}h</div>
              <div className="text-xs text-muted-foreground">Email 1</div>
            </div>
            <div className="flex-1 h-0.5 bg-border min-w-[40px]" />
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
              <div className="text-xs font-medium mt-1">{settings.second_email_delay_hours}h</div>
              <div className="text-xs text-muted-foreground">Email 2</div>
            </div>
            <div className="flex-1 h-0.5 bg-border min-w-[40px]" />
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <div className="text-xs font-medium mt-1">{settings.third_email_delay_hours}h</div>
              <div className="text-xs text-muted-foreground">Email 3</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AbandonedCartSettings;