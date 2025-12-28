import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useOrderRealtime } from "@/hooks/useOrderRealtime";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  RotateCcw,
  ArrowLeft,
  Copy,
  AlertCircle
} from "lucide-react";

const ORDER_STEPS = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'processing', label: 'Processing', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: MapPin },
  { status: 'completed', label: 'Completed', icon: CheckCircle },
];

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Real-time order updates
  useOrderRealtime(orderId || null);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID required');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            total_price
          ),
          order_timeline(
            id,
            event_type,
            event_title,
            event_description,
            created_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Verify ownership if user is logged in
      if (user && data.user_id && data.user_id !== user.id) {
        throw new Error('Access denied');
      }

      return data;
    },
    enabled: !!orderId,
  });

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const index = ORDER_STEPS.findIndex(s => s.status === order.status);
    return index >= 0 ? index : 0;
  };

  const copyOrderNumber = () => {
    if (order) {
      navigator.clipboard.writeText(order.order_number);
      toast({ title: "Order number copied" });
    }
  };

  const handleReorder = async () => {
    if (!order?.order_items) return;
    
    // Navigate to cart with items to add
    toast({ title: "Reorder feature coming soon", description: "This will add items to your cart" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This order doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate('/orders')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();
  const billingAddress = order.billing_address as any;
  const shippingAddress = (order.shipping_address || order.billing_address) as any;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/orders" className="hover:text-foreground">My Orders</Link>
          <span>/</span>
          <span className="text-foreground">{order.order_number}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyOrderNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReorder}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reorder
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Tracker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex justify-between">
                    {ORDER_STEPS.map((step, index) => {
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;
                      const Icon = step.icon;
                      
                      return (
                        <div key={step.status} className="flex flex-col items-center flex-1">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                            ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                          `}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={`
                            mt-2 text-xs text-center
                            ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}
                          `}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(currentStep / (ORDER_STEPS.length - 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {order.tracking_number && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Tracking Number</p>
                    <p className="text-lg font-mono">{order.tracking_number}</p>
                  </div>
                )}

                {order.estimated_delivery_date && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                    <p className="font-medium">
                      {new Date(order.estimated_delivery_date).toLocaleDateString('en-ZA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        {item.product_sku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">R{item.total_price?.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">R{item.unit_price?.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            {order.order_timeline && order.order_timeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.order_timeline.map((event: any, index: number) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {index < order.order_timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-border flex-1 mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="font-medium">{event.event_title}</p>
                          {event.event_description && (
                            <p className="text-sm text-muted-foreground">{event.event_description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R{order.subtotal?.toFixed(2)}</span>
                </div>
                {order.shipping_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>R{order.shipping_amount?.toFixed(2)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-R{order.discount_amount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-4 flex justify-between font-bold">
                  <span>Total</span>
                  <span>R{order.total_amount?.toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status === 'paid' ? 'Paid' : order.payment_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{shippingAddress?.name || billingAddress?.name}</p>
                  <p>{shippingAddress?.street || billingAddress?.street}</p>
                  {(shippingAddress?.suburb || billingAddress?.suburb) && (
                    <p>{shippingAddress?.suburb || billingAddress?.suburb}</p>
                  )}
                  <p>
                    {shippingAddress?.city || billingAddress?.city}, {shippingAddress?.postal_code || billingAddress?.postal_code}
                  </p>
                  <p>{shippingAddress?.country || billingAddress?.country || 'South Africa'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/contact">Contact Support</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/return-request">Request Return</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDetailPage;
