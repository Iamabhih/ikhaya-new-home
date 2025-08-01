import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useEffect } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Shield, Lock, CreditCard, Truck, CheckCircle, Clock } from "lucide-react";
const CheckoutPage = () => {
  const {
    items,
    total
  } = useCart();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }

    // Check for payment status in URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cancelled') === 'true') {
      toast.error("Payment was cancelled. Please try again.");
      window.history.replaceState({}, '', '/checkout');
    }
    if (urlParams.get('failed') === 'true') {
      toast.error("Payment failed. Please try again or choose a different payment method.");
      window.history.replaceState({}, '', '/checkout');
    }
  }, [items.length, navigate]);
  if (items.length === 0) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-16 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-secondary/15 rounded-full blur-2xl animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/cart">Cart</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-6 py-3 mb-6 shadow-lg">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                SSL Secured Checkout
              </span>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
              Secure Checkout
            </h1>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Complete your order with our secure payment system. Your information is protected with industry-standard encryption.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Security & Trust Badges */}
        <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Secure Payment</p>
                  <p className="text-xs text-muted-foreground">256-bit SSL encryption</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Secure Shipping</p>
                  <p className="text-xs text-muted-foreground">On all orders</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Easy Returns</p>
                  <p className="text-xs text-muted-foreground">30-day guarantee</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Fast Processing</p>
                  <p className="text-xs text-muted-foreground">1-2 business days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Checkout Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Payment Details</h2>
                </div>
                
                <CheckoutForm user={user || null} onComplete={() => {}} />
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                  <OrderSummary items={items} total={total} />
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-0 bg-white/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Your Privacy is Protected</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use advanced encryption and never store your payment information. 
                    Your data is processed securely and privately.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-0 bg-white/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-4">We Accept</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-center border border-white/30">
                      <span className="text-xs font-medium">VISA</span>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-center border border-white/30">
                      <span className="text-xs font-medium">MASTER</span>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 flex items-center justify-center border border-white/30">
                      <span className="text-xs font-medium">PAYPAL</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    All transactions are secured and encrypted
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Customer Support */}
            <Card className="border-0 bg-white/30 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our customer support team is here to assist you
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center justify-center gap-2">
                      <span>📞</span>
                      <span>+27 31 332 7192</span>
                    </p>
                    <p className="flex items-center justify-center gap-2">
                      <span>✉️</span>
                      <span>info@ikhaya.shop</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Available Monday - Friday, 9AM - 5PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="mt-12 text-center">
          <Card className="border-0 bg-white/30 backdrop-blur-sm shadow-lg inline-block">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Protected by 256-bit SSL encryption</span>
                <span>•</span>
                <span>PCI DSS Compliant</span>
                <span>•</span>
                <span>GDPR Protected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>;
};
export default CheckoutPage;