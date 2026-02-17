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
import { usePaymentLogger } from "@/hooks/usePaymentLogger";

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const { logPaymentSuccessPage, logClientError } = usePaymentLogger();
  
  useEffect(() => {
    const processSuccessfulPayment = async () => {
      // PayFast sends these parameters in the return URL
      const paymentId = searchParams.get('pf_payment_id');
      const merchantId = searchParams.get('merchant_id');
      const amount = searchParams.get('amount_gross');
      const orderNumber = searchParams.get('m_payment_id'); // This is our order reference
      
      // If no order number, try to get it from session storage
      let orderRef = orderNumber;
      if (!orderRef) {
        orderRef = sessionStorage.getItem('currentOrderRef');
      }

      // Log arrival at success page
      await logPaymentSuccessPage({
        orderNumber: orderRef || 'unknown',
        pfPaymentId: paymentId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        source: orderNumber ? 'payfast_return' : 'session_storage'
      });

      if (!orderRef) {
        console.error('No order reference found');
        await logClientError({ orderNumber: 'unknown' }, 'No order reference found on success page');
        toast.error('No order reference found. Please contact support.');
        navigate('/');
        return;
      }

      try {
        // Call the process-order function with the order reference
        const { data: processResult, error: processError } = await supabase.functions.invoke('process-order', {
          body: {
            orderNumber: orderRef,
            source: 'success_page',
            paymentData: {
              pf_payment_id: paymentId,
              merchant_id: merchantId,
              amount_gross: amount,
              payment_status: 'COMPLETE'
            }
          }
        });

        if (processError) {
          console.error('Error calling process-order function:', processError);
          toast.error('Error processing your order. Please contact support.');
          navigate('/');
          return;
        }

        if (processResult?.success) {
          // Get the completed order details
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('order_number', orderRef)
            .maybeSingle();

          if (orderError) {
            console.error('Error fetching order:', orderError);
          }

          if (orderData) {
            setOrderDetails(orderData);
            clearCart();
            sessionStorage.removeItem('currentOrderRef');
            toast.success('Payment successful! Your order has been confirmed.');
          } else {
            console.warn('Order not found in database, but payment was successful');
            clearCart();
            setOrderDetails({ order_number: orderRef });
            toast.success('Payment successful! Your order has been received.');
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
  }, [searchParams, clearCart, navigate]);

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
