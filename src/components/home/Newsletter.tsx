import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailService } from "@/hooks/useEmailService";
import { ArrowRight, Loader2 } from "lucide-react";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendAdminNotification } = useEmailService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;

      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          email,
          source: 'newsletter_signup',
          metadata: {
            page_url: window.location.href,
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
          setEmail("");
          return;
        }
        throw error;
      }

      await sendAdminNotification({
        type: 'contact-form',
        subject: 'New Newsletter Subscription',
        message: `New newsletter subscription from: ${email}`,
        data: { email, source: 'newsletter_signup' },
      });

      toast.success("Welcome! You're now subscribed.");
      setEmail("");
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
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Stay Updated
          </h2>
          <p className="text-background/70 mb-8 text-sm sm:text-base max-w-md mx-auto">
            Subscribe to receive updates on new arrivals, special offers, and home inspiration.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 bg-background/10 border-background/20 text-background placeholder:text-background/50 focus:bg-background/15 focus:border-background/40"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-6 bg-background text-foreground hover:bg-background/90 font-medium"
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
