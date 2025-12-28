import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle,
  Save
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, any>;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'auto_complete',
    name: 'Auto-Complete Orders',
    description: 'Automatically mark delivered orders as completed after X days',
    enabled: false,
    config: { days: 7 },
  },
  {
    id: 'auto_cancel_pending',
    name: 'Auto-Cancel Abandoned Orders',
    description: 'Cancel pending orders with no payment after X days',
    enabled: false,
    config: { days: 3 },
  },
  {
    id: 'auto_processing',
    name: 'Auto-Process on Payment',
    description: 'Automatically move to processing when payment is confirmed',
    enabled: true,
    config: {},
  },
  {
    id: 'urgent_high_value',
    name: 'Flag High-Value Orders',
    description: 'Mark orders above threshold as urgent priority',
    enabled: false,
    config: { threshold: 5000 },
  },
];

export const AutomationRulesPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);

  // Fetch automation rules from site_settings
  const { data: savedRules } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'order_automation_rules')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data?.setting_value) {
        const parsed = data.setting_value as AutomationRule[];
        setRules(parsed);
        return parsed;
      }
      return DEFAULT_RULES;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rulesToSave: AutomationRule[]) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'order_automation_rules',
          setting_value: rulesToSave as any,
        }, { onConflict: 'setting_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Automation rules saved" });
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save rules",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (ruleId: string, enabled: boolean) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, enabled } : r
    ));
  };

  const handleConfigChange = (ruleId: string, key: string, value: any) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, config: { ...r.config, [key]: value } } : r
    ));
  };

  const handleSave = () => {
    saveMutation.mutate(rules);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Order Automation Rules
        </CardTitle>
        <CardDescription>
          Configure automatic actions for order management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div 
            key={rule.id}
            className="flex items-start justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{rule.name}</span>
                <Badge variant={rule.enabled ? "default" : "secondary"}>
                  {rule.enabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {rule.description}
              </p>
              
              {/* Config inputs based on rule type */}
              {rule.config.days !== undefined && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Days:</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={rule.config.days}
                    onChange={(e) => handleConfigChange(rule.id, 'days', parseInt(e.target.value) || 1)}
                    className="w-20 h-8"
                    disabled={!rule.enabled}
                  />
                </div>
              )}
              
              {rule.config.threshold !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Threshold: R</span>
                  <Input
                    type="number"
                    min={100}
                    value={rule.config.threshold}
                    onChange={(e) => handleConfigChange(rule.id, 'threshold', parseInt(e.target.value) || 100)}
                    className="w-24 h-8"
                    disabled={!rule.enabled}
                  />
                </div>
              )}
            </div>
            
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => handleToggle(rule.id, checked)}
            />
          </div>
        ))}

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Rules"}
        </Button>
      </CardContent>
    </Card>
  );
};
