
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

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();
  const navigate = useNavigate();
  
  useEffect(() => {
    const processSuccessfulPayment = async () => {
      // Get order ID from URL
      const orderId = searchParams.get('order_id');
      
      if (!orderId) {
        console.error('No order ID in URL');
        toast.error('Invalid order reference');
        navigate('/');
        return;
      }

      try {
        // Get pending order from sessionStorage
        const pendingOrderData = sessionStorage.getItem(`pending_order_${orderId}`);
        
        if (pendingOrderData) {
          const orderData = JSON.parse(pendingOrderData);
          
          // Create order in database
          const { data: order, error } = await supabase
            .from('orders')
            .insert({
              order_number: orderId,
              user_id: orderData.userId || null,
              email: orderData.formData.email,
              subtotal: orderData.cartTotal,
              shipping_amount: orderData.deliveryFee,
              total_amount: orderData.totalAmount,
              status: 'processing',
              payment_status: 'paid',
              payment_gateway: 'payfast',
              billing_address: {
                first_name: orderData.formData.firstName,
                last_name: orderData.formData.lastName,
                email: orderData.formData.email,
                phone: orderData.formData.phone,
                address: orderData.formData.address,
                city: orderData.formData.city,
                province: orderData.formData.province,
                postal_code: orderData.formData.postalCode
              },
              shipping_address: {
                first_name: orderData.formData.firstName,
                last_name: orderData.formData.lastName,
                email: orderData.formData.email,
                phone: orderData.formData.phone,
                address: orderData.formData.address,
                city: orderData.formData.city,
                province: orderData.formData.province,
                postal_code: orderData.formData.postalCode
              }
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating order:', error);
            // Order might already exist from webhook
            const { data: existingOrder } = await supabase
              .from('orders')
              .select('*')
              .eq('order_number', orderId)
              .single();
            
            if (existingOrder) {
              setOrderDetails(existingOrder);
            }
          } else {
            setOrderDetails(order);
            
            // Create order items
            const orderItems = orderData.cartItems.map((item: any) => ({
              order_id: order.id,
              product_id: item.product_id || item.product?.id,
              quantity: item.quantity,
              unit_price: item.product?.price || 0,
              total_price: (item.product?.price || 0) * item.quantity,
              product_name: item.product?.name || 'Product'
            }));

            await supabase.from('order_items').insert(orderItems);
          }
          
          // Clear sessionStorage
          sessionStorage.removeItem(`pending_order_${orderId}`);
          
          // Clear cart
          clearCart();
          
          toast.success('Payment successful! Your order has been confirmed.');
        } else {
          // Try to fetch from database
          const { data: order } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('order_number', orderId)
            .single();
          
          if (order) {
            setOrderDetails(order);
            clearCart();
          } else {
            toast.error('Order not found');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error processing order:', error);
        toast.error('Error processing your order');
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
