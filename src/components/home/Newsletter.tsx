import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailService } from "@/hooks/useEmailService";
import { Mail, Send, CheckCircle, Heart } from "lucide-react";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendAdminNotification } = useEmailService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get user metadata for tracking
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;

      // Store newsletter subscription in dedicated table
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          mobile_number: mobile || null,
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
        // Handle duplicate email gracefully
        if (error.code === '23505') {
          toast.success("You're already subscribed to our newsletter!");
          setEmail("");
          return;
        }
        throw error;
      }

      // Send admin notification about new subscription
      await sendAdminNotification({
        type: 'contact-form',
        subject: 'New Newsletter Subscription',
        message: `New newsletter subscription from: ${firstName} ${lastName} (${email})`,
        data: { email, firstName, lastName, mobile, source: 'newsletter_signup' },
      });

      toast.success("Thank you for subscribing to our newsletter!");
      setEmail("");
      setFirstName("");
      setLastName("");
      setMobile("");
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-secondary relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-foreground/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-4xl mx-auto border-0 bg-primary-foreground/10 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="p-12 text-center text-primary-foreground">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full mb-8 border border-primary-foreground/30">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Stay in the Loop
              </h2>
              <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto">
                Get the latest updates on new arrivals, exclusive offers, and home inspiration delivered straight to your inbox
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
                <CheckCircle className="w-8 h-8 text-primary-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Exclusive Deals</h3>
                <p className="text-primary-foreground/80 text-sm">First access to sales and special promotions</p>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
                <Heart className="w-8 h-8 text-primary-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">New Arrivals</h3>
                <p className="text-primary-foreground/80 text-sm">Be the first to discover our latest products</p>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
                <Send className="w-8 h-8 text-primary-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Home Tips</h3>
                <p className="text-primary-foreground/80 text-sm">Expert advice and styling inspiration</p>
              </div>
            </div>

            {/* Newsletter Form */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-primary-foreground/90 backdrop-blur-sm text-foreground border-0 shadow-lg h-12 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-foreground/50"
                  disabled={loading}
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-primary-foreground/90 backdrop-blur-sm text-foreground border-0 shadow-lg h-12 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-foreground/50"
                  disabled={loading}
                />
              </div>

              {/* Contact Fields */}
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-primary-foreground/90 backdrop-blur-sm text-foreground border-0 shadow-lg h-12 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-foreground/50"
                  disabled={loading}
                />
                <Input
                  type="tel"
                  placeholder="Mobile Number (Optional)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="bg-primary-foreground/90 backdrop-blur-sm text-foreground border-0 shadow-lg h-12 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-foreground/50"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg h-12 px-8 font-semibold transition-all duration-300 hover:scale-105 group"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Subscribing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Subscribe
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>
              
              {/* Privacy Note */}
              <p className="text-primary-foreground/70 text-sm mt-4 leading-relaxed">
                We respect your privacy. Unsubscribe at any time. 
                <br />
                <span className="text-primary-foreground/60">No spam, just great content!</span>
              </p>
            </form>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 pt-8 border-t border-primary-foreground/20">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">5,000+ Happy Subscribers</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Weekly Home Inspiration</span>
              </div>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Mail className="w-4 h-4" />
                <span className="text-sm">No Spam Promise</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};