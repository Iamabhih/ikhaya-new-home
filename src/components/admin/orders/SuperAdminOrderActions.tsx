import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminOrderActionsProps {
  order: any;
  onOrderUpdated: () => void;
  onOrderDeleted: () => void;
}

export const SuperAdminOrderActions = ({ order, onOrderUpdated, onOrderDeleted }: SuperAdminOrderActionsProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    order_number: order.order_number || '',
    status: order.status || '',
    fulfillment_status: order.fulfillment_status || '',
    priority: order.priority || '',
    total_amount: order.total_amount || 0,
    subtotal: order.subtotal || 0,
    delivery_fee: order.delivery_fee || 0,
    tax_amount: order.tax_amount || 0,
    discount_amount: order.discount_amount || 0,
    email: order.email || '',
    customer_notes: order.customer_notes || '',
    internal_notes: order.internal_notes || '',
    tracking_number: order.tracking_number || '',
    payment_method: order.payment_method || '',
    tags: order.tags?.join(', ') || '',
    billing_address: JSON.stringify(order.billing_address || {}, null, 2),
    shipping_address: JSON.stringify(order.shipping_address || {}, null, 2)
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  // Update order mutation - moved before conditional return to satisfy Rules of Hooks
  const updateOrderMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      // Parse JSON fields
      let billingAddress, shippingAddress;
      try {
        billingAddress = JSON.parse(updatedData.billing_address);
        shippingAddress = JSON.parse(updatedData.shipping_address);
      } catch (error) {
        throw new Error('Invalid JSON in address fields');
      }

      const updatePayload = {
        ...updatedData,
        total_amount: parseFloat(updatedData.total_amount),
        subtotal: parseFloat(updatedData.subtotal),
        delivery_fee: parseFloat(updatedData.delivery_fee || 0),
        tax_amount: parseFloat(updatedData.tax_amount || 0),
        discount_amount: parseFloat(updatedData.discount_amount || 0),
        tags: updatedData.tags ? updatedData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Order Updated",
        description: "Order has been successfully updated.",
      });
      setShowEditDialog(false);
      onOrderUpdated();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      // Delete order timeline entries
      await supabase
        .from('order_timeline')
        .delete()
        .eq('order_id', order.id);

      // Delete order notes
      await supabase
        .from('order_notes')
        .delete()
        .eq('order_id', order.id);

      // Delete order status history
      await supabase
        .from('order_status_history')
        .delete()
        .eq('order_id', order.id);

      // Finally delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Order Deleted",
        description: "Order and all related data have been permanently deleted.",
      });
      setShowDeleteDialog(false);
      onOrderDeleted();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  // Only show for superadmins - placed after all hooks to satisfy Rules of Hooks
  if (!isSuperAdmin) {
    return null;
  }

  const handleEditSubmit = () => {
    updateOrderMutation.mutate(editForm);
  };

  const handleDeleteConfirm = () => {
    deleteOrderMutation.mutate();
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditDialog(true)}
          className="text-blue-600 hover:text-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Edit Order
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Edit Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Edit Order {order.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="order_number">Order Number</Label>
                    <Input
                      id="order_number"
                      value={editForm.order_number}
                      onChange={(e) => setEditForm({ ...editForm, order_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Customer Email</Label>
                    <Input
                      id="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                        <SelectItem value="payment_failed">Payment Failed</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fulfillment_status">Fulfillment Status</Label>
                    <Select value={editForm.fulfillment_status} onValueChange={(value) => setEditForm({ ...editForm, fulfillment_status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                        <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                        <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subtotal">Subtotal</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={editForm.subtotal}
                      onChange={(e) => setEditForm({ ...editForm, subtotal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery_fee">Delivery Fee</Label>
                    <Input
                      id="delivery_fee"
                      type="number"
                      step="0.01"
                      value={editForm.delivery_fee}
                      onChange={(e) => setEditForm({ ...editForm, delivery_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tax_amount">Tax Amount</Label>
                    <Input
                      id="tax_amount"
                      type="number"
                      step="0.01"
                      value={editForm.tax_amount}
                      onChange={(e) => setEditForm({ ...editForm, tax_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_amount">Discount Amount</Label>
                    <Input
                      id="discount_amount"
                      type="number"
                      step="0.01"
                      value={editForm.discount_amount}
                      onChange={(e) => setEditForm({ ...editForm, discount_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_amount">Total Amount</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      step="0.01"
                      value={editForm.total_amount}
                      onChange={(e) => setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tracking_number">Tracking Number</Label>
                    <Input
                      id="tracking_number"
                      value={editForm.tracking_number}
                      onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Input
                      id="payment_method"
                      value={editForm.payment_method}
                      onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_notes">Customer Notes</Label>
                    <Textarea
                      id="customer_notes"
                      value={editForm.customer_notes}
                      onChange={(e) => setEditForm({ ...editForm, customer_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal_notes">Internal Notes</Label>
                    <Textarea
                      id="internal_notes"
                      value={editForm.internal_notes}
                      onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="billing_address">Billing Address (JSON)</Label>
                    <Textarea
                      id="billing_address"
                      value={editForm.billing_address}
                      onChange={(e) => setEditForm({ ...editForm, billing_address: e.target.value })}
                      rows={6}
                      className="font-mono text-sm"
                      placeholder='{"address": "123 Main St", "city": "Cape Town", "province": "Western Cape", "postal_code": "8001"}'
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_address">Shipping Address (JSON)</Label>
                    <Textarea
                      id="shipping_address"
                      value={editForm.shipping_address}
                      onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                      rows={6}
                      className="font-mono text-sm"
                      placeholder='{"address": "123 Main St", "city": "Cape Town", "province": "Western Cape", "postal_code": "8001"}'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit} 
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Order
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">
                This action cannot be undone!
              </p>
              <p className="text-red-700 text-sm mt-1">
                Deleting this order will permanently remove:
              </p>
              <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
                <li>Order information and items</li>
                <li>Order timeline and history</li>
                <li>Order notes and comments</li>
                <li>Payment transaction records</li>
              </ul>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Order Details:</span>
                <Badge variant="outline">{order.status}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Order Number: {order.order_number}</p>
                <p>Customer: {order.email}</p>
                <p>Total: R{order.total_amount?.toFixed(2)}</p>
                <p>Date: {new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Deleting..." : "Delete Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};