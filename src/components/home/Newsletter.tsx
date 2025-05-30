
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailService } from "@/hooks/useEmailService";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendAdminNotification } = useEmailService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store newsletter subscription
      const { error } = await supabase
        .from('email_logs')
        .insert({
          email_address: email,
          template_name: 'newsletter-signup',
          subject: 'Newsletter Subscription',
          status: 'sent',
          metadata: { source: 'newsletter_form' },
          sent_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Send admin notification about new subscription
      await sendAdminNotification({
        type: 'contact-form',
        subject: 'New Newsletter Subscription',
        message: `New newsletter subscription from: ${email}`,
        data: { email, source: 'newsletter_form' },
      });

      toast.success("Thank you for subscribing to our newsletter!");
      setEmail("");
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-primary text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
        <p className="text-lg mb-8 opacity-90">
          Subscribe to our newsletter for the latest products, offers, and home inspiration
        </p>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white text-foreground"
            disabled={loading}
          />
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </section>
  );
};
