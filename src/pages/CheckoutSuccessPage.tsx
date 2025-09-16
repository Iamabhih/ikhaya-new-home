
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Home, Mail } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePendingOrder } from "@/hooks/usePendingOrder";

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();
  const { clearPendingOrder } = usePendingOrder();
  const navigate = useNavigate();
  
  useEffect(() => {
    const processSuccessfulPayment = async () => {
      // Get PayFast return parameters
      const orderId = searchParams.get('order_id');
      const fromPayfast = searchParams.get('from');
      const paymentStatus = searchParams.get('payment_status');
      
      if (!orderId) {
        console.error('No order ID in URL');
        toast.error('Invalid order reference');
        navigate('/');
        return;
      }

      console.log('Processing PayFast return:', { orderId, fromPayfast, paymentStatus });

      try {
        // Call centralized order processing function
        const { data: processResult, error: processError } = await supabase.functions.invoke('process-order', {
          body: {
            orderNumber: orderId,
            source: 'success_page'
          }
        });

        if (processError) {
          console.error('Error calling order processing function:', processError);
          toast.error('Error processing your order. Please contact support.');
          navigate('/');
          return;
        }

        if (processResult?.success) {
          // Get the completed order details
          const { data: orderData } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('order_number', orderId)            .maybeSingle();

          if (orderData) {
            setOrderDetails(orderData);
            clearCart();
            await clearPendingOrder(orderId);
            toast.success('Payment successful! Your order has been confirmed.');
          } else {
            console.error('Order not found after processing');
            toast.error('Order not found. Please contact support.');
            navigate('/');
          }
        } else {
          console.error('Order processing failed:', processResult);
          toast.error('Failed to process order. Please contact support.');
          navigate('/');
        }
      } catch (error) {
        console.error('Error processing order:', error);
        toast.error('Error processing your order. Please contact support.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    processSuccessfulPayment();
  }, [searchParams, clearCart, clearPendingOrder, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p>Processing your order...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="bg-gradient-to-b from-green-50 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Thank you for your order. We've received your payment and are processing your order.
            </p>
            
            {orderDetails && (
              <div className="bg-white rounded-lg p-6 shadow-lg inline-block">
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-2xl font-bold text-primary">{orderDetails.order_number}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* What's Next */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                What Happens Next?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Order Confirmation</h4>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email confirmation shortly with your order details.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Order Processing</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll start preparing your order within 1-2 business days.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Shipping</h4>
                    <p className="text-sm text-muted-foreground">
                      Your order will be shipped and you'll receive tracking information.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/account/orders">
                <Package className="w-4 h-4 mr-2" />
                View My Orders
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutSuccessPage;
