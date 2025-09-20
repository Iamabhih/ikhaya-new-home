import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Package, Mail, Phone, MapPin, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface GuestOrderLookupProps {
  className?: string;
}

export const GuestOrderLookup = ({ className }: GuestOrderLookupProps) => {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['guest-order', email, orderNumber],
    queryFn: async () => {
      if (!email.trim() || !orderNumber.trim()) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, price, slug)
          )
        `)
        .eq('email', email.trim())
        .eq('order_number', orderNumber.trim())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: searchTriggered && !!email.trim() && !!orderNumber.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !orderNumber.trim()) {
      toast.error("Please enter both email and order number");
      return;
    }
    
    setSearchTriggered(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-orange-100 text-orange-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Track Your Order
          </CardTitle>
          <CardDescription>
            Enter your email and order number to track your order status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g. ORD-12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Searching..." : "Track Order"}
            </Button>
          </form>

          {searchTriggered && !isLoading && !order && !error && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Order Found</h3>
              <p className="text-muted-foreground">
                Please check your email and order number and try again.
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-destructive text-sm mb-2">
                Error loading order details. Please try again.
              </div>
            </div>
          )}

          {order && (
            <div className="space-y-6 mt-6">
              <Separator />
              
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Order {order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    Placed on {formatDate(order.created_at)}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status.toUpperCase()}
                </Badge>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.email}</span>
                  </div>
                  {(order.shipping_address as any)?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{(order.shipping_address as any).phone}</span>
                    </div>
                  )}
                  {order.shipping_address && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm">
                        <div>{(order.shipping_address as any).firstName} {(order.shipping_address as any).lastName}</div>
                        <div>{(order.shipping_address as any).address}</div>
                        <div>{(order.shipping_address as any).city}, {(order.shipping_address as any).province} {(order.shipping_address as any).postalCode}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.order_items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × R{Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">R{Number(item.total_price).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>R{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Payment Method: {order.payment_method || 'PayFast'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                      Payment {order.payment_status || 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              {order.created_at && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium">Order Placed</span>
                        <span className="text-muted-foreground ml-2">{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    
                    {order.shipped_at && (
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="font-medium">Shipped</span>
                          <span className="text-muted-foreground ml-2">{formatDate(order.shipped_at)}</span>
                        </div>
                      </div>
                    )}
                    
                    {order.delivered_at && (
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <span className="font-medium text-green-600">Delivered</span>
                          <span className="text-muted-foreground ml-2">{formatDate(order.delivered_at)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};