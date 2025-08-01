import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, User, CreditCard, MapPin, Clock, Truck, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
}

export const OrderDetailsModal = ({ orderId, isOpen, onClose, onStatusUpdate }: OrderDetailsModalProps) => {
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-details', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            total_price,
            variant_attributes
          ),
          order_status_history (
            id,
            status,
            notes,
            created_at,
            created_by
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && isOpen,
  });

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!orderId) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Add notes if provided
      if (notes.trim()) {
        await supabase
          .from('order_status_history')
          .insert({
            order_id: orderId,
            status: newStatus,
            notes: notes.trim()
          });
        setNotes("");
      }
      
      toast.success(`Order status updated to ${newStatus}`);
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Order</DialogTitle>
            <DialogDescription>Please wait while we load the order details...</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">Loading order details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Not Found</DialogTitle>
            <DialogDescription>The requested order could not be found or you don't have permission to view it.</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">Order not found</div>
        </DialogContent>
      </Dialog>
    );
  }

  const billingAddress = order.billing_address as any;
  const shippingAddress = order.shipping_address as any;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order #{order.order_number}</span>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>View and manage order information, items, and status</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items ({order.order_items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start border-b pb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product_name}</h4>
                        {item.product_sku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
                        )}
                        {item.variant_attributes && Object.keys(item.variant_attributes as any).length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Variant: {Object.entries(item.variant_attributes as any).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">R{item.unit_price.toFixed(2)} each</p>
                        <p className="font-medium">R{item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_status_history?.map((entry) => (
                    <div key={entry.id} className="flex gap-4 border-l-2 border-muted pl-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={order.status}
                  onValueChange={(value) => updateOrderStatus(value as OrderStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder="Add notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{order.email}</p>
                <p className="text-sm text-muted-foreground">
                  Order placed: {new Date(order.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R{order.subtotal.toFixed(2)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>R{order.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {order.shipping_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>R{order.shipping_amount.toFixed(2)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-R{order.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span>R{order.total_amount.toFixed(2)}</span>
                </div>
                {order.payment_method && (
                  <p className="text-sm text-muted-foreground">
                    Payment method: {order.payment_method}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {(shippingAddress || billingAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Addresses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shippingAddress && (
                    <div>
                      <h4 className="font-medium mb-1">Shipping Address</h4>
                      <div className="text-sm text-muted-foreground">
                        {typeof shippingAddress === 'string' ? (
                          <p>{shippingAddress}</p>
                        ) : (
                          <>
                            {shippingAddress.street && <p>{shippingAddress.street}</p>}
                            {shippingAddress.city && <p>{shippingAddress.city}</p>}
                            {shippingAddress.state && <p>{shippingAddress.state}</p>}
                            {shippingAddress.zip && <p>{shippingAddress.zip}</p>}
                            {shippingAddress.country && <p>{shippingAddress.country}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-1">Billing Address</h4>
                    <div className="text-sm text-muted-foreground">
                      {typeof billingAddress === 'string' ? (
                        <p>{billingAddress}</p>
                      ) : (
                        <>
                          {billingAddress.street && <p>{billingAddress.street}</p>}
                          {billingAddress.city && <p>{billingAddress.city}</p>}
                          {billingAddress.state && <p>{billingAddress.state}</p>}
                          {billingAddress.zip && <p>{billingAddress.zip}</p>}
                          {billingAddress.country && <p>{billingAddress.country}</p>}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tracking Info */}
            {order.tracking_number && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-sm">{order.tracking_number}</p>
                  {order.estimated_delivery_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimated delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};