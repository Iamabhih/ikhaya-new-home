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
    <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-secondary relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <Card className="max-w-4xl mx-auto border-0 bg-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="p-12 text-center text-white">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-8 border border-white/30">
              <Mail className="w-8 h-8 text-white" />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Stay in the Loop
              </h2>
              <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                Get the latest updates on new arrivals, exclusive offers, and home inspiration delivered straight to your inbox
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <CheckCircle className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Exclusive Deals</h3>
                <p className="text-white/80 text-sm">First access to sales and special promotions</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Heart className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">New Arrivals</h3>
                <p className="text-white/80 text-sm">Be the first to discover our latest products</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <Send className="w-8 h-8 text-white mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Home Tips</h3>
                <p className="text-white/80 text-sm">Expert advice and styling inspiration</p>
              </div>
            </div>

            {/* Newsletter Form */}
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl p-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/90 backdrop-blur-sm text-foreground border-0 shadow-lg h-12 pl-12 text-base placeholder:text-muted-foreground focus:ring-2 focus:ring-white/50"
                      disabled={loading}
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-white text-primary hover:bg-white/90 shadow-lg h-12 px-8 font-semibold transition-all duration-300 hover:scale-105 group"
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
                </div>
              </Card>
              
              {/* Privacy Note */}
              <p className="text-white/70 text-sm mt-4 leading-relaxed">
                We respect your privacy. Unsubscribe at any time. 
                <br />
                <span className="text-white/60">No spam, just great content!</span>
              </p>
            </form>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 pt-8 border-t border-white/20">
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">5,000+ Happy Subscribers</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Heart className="w-4 h-4" />
                <span className="text-sm">Weekly Home Inspiration</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
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