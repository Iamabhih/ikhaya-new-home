import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailService } from "@/hooks/useEmailService";
import { ArrowRight, Loader2 } from "lucide-react";

export const Newsletter = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    subscribeTrader: false,
    subscribeRetail: true,
  });
  const [loading, setLoading] = useState(false);
  const { sendAdminNotification } = useEmailService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subscribeTrader && !formData.subscribeRetail) {
      toast.error("Please select at least one subscription type.");
      return;
    }

    setLoading(true);

    try {
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;

      const subscriptionTypes = [];
      if (formData.subscribeTrader) subscriptionTypes.push('trader');
      if (formData.subscribeRetail) subscriptionTypes.push('retail');

      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          email: formData.email,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          mobile_number: formData.mobile || null,
          source: 'newsletter_signup',
          metadata: {
            page_url: window.location.href,
            subscription_types: subscriptionTypes,
            utm_source: new URLSearchParams(window.location.search).get('utm_source'),
            utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
            utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
          },
          user_agent: userAgent,
          referrer: referrer || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.success("You're already subscribed!");
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            mobile: "",
            subscribeTrader: false,
            subscribeRetail: true,
          });
          return;
        }
        throw error;
      }

      await sendAdminNotification({
        type: 'contact-form',
        subject: 'New Newsletter Subscription',
        message: `New newsletter subscription from: ${formData.firstName} ${formData.lastName} (${formData.email})`,
        data: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          mobile: formData.mobile,
          subscription_types: subscriptionTypes,
          source: 'newsletter_signup'
        },
      });

      toast.success("Welcome! You're now subscribed.");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        subscribeTrader: false,
        subscribeRetail: true,
      });
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-foreground text-background">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="max-w-xl mx-auto text-center">
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Stay Updated
          </h2>
          <p className="text-background/70 mb-8 text-sm sm:text-base max-w-md mx-auto">
            Subscribe to receive updates on new arrivals, special offers, and home inspiration.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:bg-background/15 focus:border-background/40"
                disabled={loading}
              />
              <Input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:bg-background/15 focus:border-background/40"
                disabled={loading}
              />
            </div>

            {/* Email and Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:bg-background/15 focus:border-background/40"
                disabled={loading}
              />
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:bg-background/15 focus:border-background/40"
                disabled={loading}
              />
            </div>

            {/* Subscription Type */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-4 sm:gap-8 py-2">
              <span className="text-sm text-background/70">Subscribe to:</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="retail"
                    checked={formData.subscribeRetail}
                    onCheckedChange={(checked) => setFormData({ ...formData, subscribeRetail: checked as boolean })}
                    className="border-background/40 data-[state=checked]:bg-background data-[state=checked]:text-foreground"
                    disabled={loading}
                  />
                  <Label htmlFor="retail" className="text-sm text-background cursor-pointer">
                    Retail
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trader"
                    checked={formData.subscribeTrader}
                    onCheckedChange={(checked) => setFormData({ ...formData, subscribeTrader: checked as boolean })}
                    className="border-background/40 data-[state=checked]:bg-background data-[state=checked]:text-foreground"
                    disabled={loading}
                  />
                  <Label htmlFor="trader" className="text-sm text-background cursor-pointer">
                    Trader / Wholesale
                  </Label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto h-12 px-8 bg-background text-foreground hover:bg-background/90 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Subscribe
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Privacy Note */}
          <p className="text-background/50 text-xs mt-4">
            No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
};
