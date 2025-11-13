import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Eye, EyeOff } from "lucide-react";

export const PricingVisibilityToggle = () => {
  const { settings, updateSetting, isUpdating } = useSiteSettings();
  const hidePricing = settings?.hide_pricing === true;

  const handleToggle = (checked: boolean) => {
    updateSetting('hide_pricing', checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hidePricing ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          Pricing Visibility
        </CardTitle>
        <CardDescription>
          Control whether product prices are displayed to customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hide-pricing" className="text-base font-medium">
              Hide All Pricing
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, prices will be hidden and customers can request quotes
            </p>
          </div>
          <Switch
            id="hide-pricing"
            checked={hidePricing}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
};
