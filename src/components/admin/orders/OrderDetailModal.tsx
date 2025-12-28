import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Truck,
  User,
  CreditCard,
  MessageSquare,
  Clock,
  Send,
  Edit,
  Save,
  X
} from "lucide-react";
import { OrderTimeline } from "./OrderTimeline";
import { OrderProgressStepper } from "./OrderProgressStepper";
import { OrderQuickActions } from "./OrderQuickActions";

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (status: string, notes?: string) => void;
  onSendNotification: (type: string, metadata?: any) => void;
}

export const OrderDetailModal = ({ 
  order, 
  isOpen, 
  onClose, 
  onStatusUpdate, 
  onSendNotification 
}: OrderDetailModalProps) => {
  const [newStatus, setNewStatus] = useState(order.status);
  const [newFulfillmentStatus, setNewFulfillmentStatus] = useState(order.fulfillment_status);
  const [statusNote, setStatusNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || "");
  const [customerNotes, setCustomerNotes] = useState(order.customer_notes || "");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch order timeline
  const { data: timeline } = useQuery({
    queryKey: ['order-timeline', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_timeline')
        .select(`
          *,
          profiles:created_by(first_name, last_name)
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch order notes
  const { data: notes } = useQuery({
    queryKey: ['order-notes', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_notes')
        .select(`
          *,
          profiles:author_id(first_name, last_name)
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string, type: string }) => {
      const { data, error } = await supabase
        .from('order_notes')
        .insert({
          order_id: order.id,
          content,
          note_type: type,
          author_id: (await supabase.auth.getUser()).data.user?.id
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Order note has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['order-notes', order.id] });
      setNewNote("");
    },
  });

  // Update order notes mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ internal_notes, customer_notes }: { internal_notes: string, customer_notes: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ internal_notes, customer_notes })
        .eq('id', order.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notes Updated",
        description: "Order notes have been updated successfully",
      });
      setEditingNotes(false);
    },
  });

  const handleStatusUpdate = () => {
    if (newStatus !== order.status) {
      onStatusUpdate(newStatus, statusNote || undefined);
      setStatusNote("");
    }
  };

  const handleAddNote = (type: string) => {
    if (newNote.trim()) {
      addNoteMutation.mutate({ content: newNote, type });
    }
  };

  const handleSaveNotes = () => {
    updateOrderMutation.mutate({ 
      internal_notes: internalNotes, 
      customer_notes: customerNotes 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Stepper */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderProgressStepper 
                  currentStatus={order.status}
                  onStatusClick={(status) => {
                    onStatusUpdate(status);
                  }}
                />
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Summary</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{order.status}</Badge>
                    <Badge variant="secondary">{order.fulfillment_status}</Badge>
                    {order.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Amount</label>
                    <p className="text-lg font-bold">R{order.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <p>{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                </div>

              {/* Customer Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <p>{order.profiles?.first_name || order.profiles?.last_name
                      ? `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim()
                      : 'Guest Customer'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p>{order.profiles?.email || order.email || 'No email provided'}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-2">
                  {order.order_items && order.order_items.length > 0 ? (
                    order.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{item.product_name || 'Unknown Product'}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <span className="font-medium">R{((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No items in this order</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status & Actions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Update Order Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Order Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fulfillment Status</label>
                      <Select value={newFulfillmentStatus} onValueChange={setNewFulfillmentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                          <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                          <SelectItem value="fulfilled">Fulfilled</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Status Update Note (Optional)</label>
                    <Textarea
                      placeholder="Add a note about this status change..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleStatusUpdate}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => onSendNotification('status_change')}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Notify Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Order Notes
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingNotes(!editingNotes)}
                    >
                      {editingNotes ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingNotes ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Internal Notes</label>
                        <Textarea
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          placeholder="Internal notes visible only to staff..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Customer Notes</label>
                        <Textarea
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Notes visible to customer..."
                        />
                      </div>
                      <Button onClick={handleSaveNotes}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Notes
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {internalNotes && (
                        <div>
                          <label className="text-sm font-medium">Internal Notes</label>
                          <p className="text-sm bg-muted p-2 rounded">{internalNotes}</p>
                        </div>
                      )}
                      {customerNotes && (
                        <div>
                          <label className="text-sm font-medium">Customer Notes</label>
                          <p className="text-sm bg-muted p-2 rounded">{customerNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add New Note */}
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium">Add New Note</label>
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="mt-2"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddNote('internal')}
                        disabled={!newNote.trim()}
                      >
                        Add Internal Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddNote('customer')}
                        disabled={!newNote.trim()}
                      >
                        Add Customer Note
                      </Button>
                    </div>
                  </div>

                  {/* Existing Notes */}
                  {notes && notes.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Note History</h4>
                      <div className="space-y-2">
                        {notes.map((note: any) => (
                          <div key={note.id} className="p-3 border rounded">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={note.note_type === 'internal' ? 'default' : 'secondary'}>
                                {note.note_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              by {note.profiles?.first_name} {note.profiles?.last_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <OrderTimeline timeline={timeline || []} />
            </TabsContent>

            <TabsContent value="fulfillment">
              <Card>
                <CardHeader>
                  <CardTitle>Fulfillment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tracking Number</label>
                        <p>{order.tracking_number || 'Not assigned'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Shipped Date</label>
                        <p>{order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : 'Not shipped'}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Truck className="h-4 w-4 mr-2" />
                      Create Fulfillment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>

          {/* Quick Actions Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <OrderQuickActions
              order={order}
              onStatusUpdate={onStatusUpdate}
              onSendNotification={onSendNotification}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
