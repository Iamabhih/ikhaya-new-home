import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GuestOrderLookup } from "@/components/account/GuestOrderLookup";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

const GuestOrderTrackingPage = () => {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent({
      event_type: 'page_view',
      event_name: 'guest_order_tracking_viewed',
      page_path: window.location.pathname
    });
  }, [trackEvent]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <StandardBreadcrumbs 
          items={[
            { label: "Home", href: "/" },
            { label: "Track Order", isActive: true }
          ]} 
        />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Track Your Order</h1>
            <p className="text-lg text-muted-foreground">
              Enter your order details below to check the status of your purchase
            </p>
          </div>

          <GuestOrderLookup />

          <div className="mt-12 text-center">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              If you're having trouble finding your order or need assistance, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="text-sm">
                <strong>Email:</strong> support@homeware.co.za
              </div>
              <div className="text-sm">
                <strong>Phone:</strong> +27 11 123 4567
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GuestOrderTrackingPage;