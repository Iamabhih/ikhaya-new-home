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
import { Separator } from "@/components/ui/separator";
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
  X,
  MapPin,
  Receipt,
  Calendar,
  Hash,
  Copy,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ShoppingBag,
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

const getPaymentStatusColor = (status: string | null) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200";
    case "processing": return "bg-blue-100 text-blue-800 border-blue-200";
    case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "failed": return "bg-red-100 text-red-800 border-red-200";
    case "refunded": return "bg-purple-100 text-purple-800 border-purple-200";
    case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const getPaymentMethodLabel = (method: string | null) => {
  switch (method) {
    case "stripe": return "Stripe (Card)";
    case "payfast": return "PayFast";
    case "payflex": return "PayFlex";
    case "eft": return "EFT (Bank Transfer)";
    case "cod": return "Cash on Delivery";
    default: return method || "Not specified";
  }
};

const formatAddress = (address: any) => {
  if (!address) return null;
  const parts = [
    address.name,
    address.street,
    address.suburb,
    address.city,
    address.postal_code,
    address.country,
  ].filter(Boolean);
  return parts;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export const OrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
  onSendNotification,
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

  // Fetch FULL order data with all fields
  const { data: fullOrder } = useQuery({
    queryKey: ["admin-order-detail", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            id, product_name, product_sku, quantity, unit_price, total_price,
            variant_attributes
          ),
          profiles:user_id(first_name, last_name, email)
        `)
        .eq("id", order.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Use full order data when available, fall back to passed-in order
  const o = fullOrder || order;

  // Fetch order timeline
  const { data: timeline } = useQuery({
    queryKey: ["order-timeline", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_timeline")
        .select(`*, profiles:created_by(first_name, last_name)`)
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch order notes
  const { data: notes } = useQuery({
    queryKey: ["order-notes", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_notes")
        .select(`*, profiles:author_id(first_name, last_name)`)
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch payment transactions
  const { data: transactions } = useQuery({
    queryKey: ["order-transactions", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: isOpen,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string; type: string }) => {
      const { data, error } = await supabase.from("order_notes").insert({
        order_id: order.id,
        content,
        note_type: type,
        author_id: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Note Added", description: "Order note has been added successfully" });
      queryClient.invalidateQueries({ queryKey: ["order-notes", order.id] });
      setNewNote("");
    },
  });

  // Update order notes mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ internal_notes, customer_notes }: { internal_notes: string; customer_notes: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ internal_notes, customer_notes })
        .eq("id", order.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Notes Updated", description: "Order notes have been updated successfully" });
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
      customer_notes: customerNotes,
    });
  };

  const shippingAddr = formatAddress(
    typeof o.shipping_address === "string" ? JSON.parse(o.shipping_address) : o.shipping_address
  );
  const billingAddr = formatAddress(
    typeof o.billing_address === "string" ? JSON.parse(o.billing_address) : o.billing_address
  );

  const subtotal = o.subtotal ?? o.total_amount;
  const shippingAmount = o.shipping_amount ?? 0;
  const discountAmount = o.discount_amount ?? 0;
  const taxAmount = o.tax_amount ?? 0;
  const totalAmount = o.total_amount ?? 0;

  const orderItems = o.order_items || order.order_items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{o.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  copyToClipboard(o.order_number);
                  toast({ title: "Copied", description: "Order number copied to clipboard" });
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy #
              </Button>
              <Badge variant="outline" className="text-xs">
                {new Date(o.created_at).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-5">
            {/* Progress Stepper */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Order Progress</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{o.status}</Badge>
                    <Badge variant="secondary">{o.fulfillment_status}</Badge>
                    {o.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                    {o.priority === "high" && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">High</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderProgressStepper
                  currentStatus={o.status}
                  onStatusClick={(status) => onStatusUpdate(status)}
                />
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Order Items
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-5">Product</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                  </div>
                  <Separator />

                  {orderItems.length > 0 ? (
                    orderItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="col-span-5">
                          <span className="font-medium text-sm">{item.product_name || "Unknown Product"}</span>
                          {item.product_sku && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              SKU: {item.product_sku}
                            </span>
                          )}
                          {item.variant_attributes && (
                            <span className="block text-xs text-muted-foreground">
                              {typeof item.variant_attributes === "string"
                                ? item.variant_attributes
                                : Object.entries(item.variant_attributes || {})
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-right text-sm">
                          R{(item.unit_price || 0).toFixed(2)}
                        </div>
                        <div className="col-span-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            x{item.quantity}
                          </Badge>
                        </div>
                        <div className="col-span-3 text-right font-medium text-sm">
                          R{(item.total_price || (item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No items in this order</p>
                  )}

                  {/* Financial Summary */}
                  <Separator className="my-2" />
                  <div className="space-y-1.5 px-3 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R{subtotal.toFixed(2)}</span>
                    </div>
                    {shippingAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Delivery / Shipping
                        </span>
                        <span>R{shippingAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {shippingAmount === 0 && subtotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Delivery / Shipping
                        </span>
                        <span className="text-green-600 font-medium">FREE</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-green-600">-R{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (VAT)</span>
                        <span>R{taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base font-bold pt-1">
                      <span>Total Paid</span>
                      <span>R{totalAmount.toFixed(2)}</span>
                    </div>
                    {o.currency && o.currency !== "ZAR" && (
                      <p className="text-xs text-muted-foreground text-right">Currency: {o.currency}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer, Payment, and Address Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <p className="text-sm font-medium">
                      {o.profiles?.first_name || o.profiles?.last_name
                        ? `${o.profiles?.first_name || ""} ${o.profiles?.last_name || ""}`.trim()
                        : billingAddr?.[0] || "Guest Customer"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <p className="text-sm">{o.profiles?.email || o.email || "No email provided"}</p>
                  </div>
                  {o.user_id && (
                    <div>
                      <label className="text-xs text-muted-foreground">Account</label>
                      <Badge variant="outline" className="text-xs">Registered</Badge>
                    </div>
                  )}
                  {!o.user_id && (
                    <div>
                      <label className="text-xs text-muted-foreground">Account</label>
                      <Badge variant="secondary" className="text-xs">Guest</Badge>
                    </div>
                  )}
                  {o.source_channel && (
                    <div>
                      <label className="text-xs text-muted-foreground">Source</label>
                      <p className="text-sm capitalize">{o.source_channel}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <div className="mt-0.5">
                      <Badge className={getPaymentStatusColor(o.payment_status)}>
                        {o.payment_status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {o.payment_status === "failed" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {o.payment_status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {o.payment_status || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Method</label>
                    <p className="text-sm font-medium">{getPaymentMethodLabel(o.payment_method)}</p>
                  </div>
                  {o.payment_reference && (
                    <div>
                      <label className="text-xs text-muted-foreground">Reference</label>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate">
                          {o.payment_reference}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => {
                            copyToClipboard(o.payment_reference);
                            toast({ title: "Copied", description: "Payment reference copied" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {o.payment_gateway && (
                    <div>
                      <label className="text-xs text-muted-foreground">Gateway</label>
                      <p className="text-sm capitalize">{o.payment_gateway}</p>
                    </div>
                  )}
                  {transactions && transactions.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Transactions</label>
                      {transactions.map((txn: any) => (
                        <div key={txn.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                txn.status === "completed"
                                  ? "border-green-200 text-green-700"
                                  : txn.status === "failed"
                                  ? "border-red-200 text-red-700"
                                  : ""
                              }`}
                            >
                              {txn.transaction_type}
                            </Badge>
                            <span className="text-muted-foreground capitalize">{txn.status}</span>
                          </div>
                          <span className="font-medium">R{txn.amount?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shipping Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingAddr ? (
                    <div className="text-sm space-y-0.5">
                      {shippingAddr.map((line: string, i: number) => (
                        <p key={i} className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : billingAddr ? (
                    <div className="text-sm space-y-0.5">
                      <p className="text-xs text-muted-foreground italic mb-1">Same as billing</p>
                      {billingAddr.map((line: string, i: number) => (
                        <p key={i} className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shipping address provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {billingAddr ? (
                    <div className="text-sm space-y-0.5">
                      {billingAddr.map((line: string, i: number) => (
                        <p key={i} className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No billing address provided</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Dates */}
            {(o.shipped_at || o.delivered_at || o.completed_at || o.cancelled_at || o.estimated_delivery_date) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {o.shipped_at && (
                      <div>
                        <label className="text-xs text-muted-foreground">Shipped</label>
                        <p className="text-sm font-medium">
                          {new Date(o.shipped_at).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                    {o.delivered_at && (
                      <div>
                        <label className="text-xs text-muted-foreground">Delivered</label>
                        <p className="text-sm font-medium">
                          {new Date(o.delivered_at).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                    {o.completed_at && (
                      <div>
                        <label className="text-xs text-muted-foreground">Completed</label>
                        <p className="text-sm font-medium">
                          {new Date(o.completed_at).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                    {o.cancelled_at && (
                      <div>
                        <label className="text-xs text-muted-foreground">Cancelled</label>
                        <p className="text-sm font-medium text-destructive">
                          {new Date(o.cancelled_at).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                    {o.estimated_delivery_date && (
                      <div>
                        <label className="text-xs text-muted-foreground">Est. Delivery</label>
                        <p className="text-sm font-medium">
                          {new Date(o.estimated_delivery_date).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                    {o.expected_delivery_date && !o.estimated_delivery_date && (
                      <div>
                        <label className="text-xs text-muted-foreground">Expected Delivery</label>
                        <p className="text-sm font-medium">
                          {new Date(o.expected_delivery_date).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                    )}
                  </div>
                  {o.cancellation_reason && (
                    <div className="mt-3 p-2 bg-destructive/5 border border-destructive/20 rounded">
                      <label className="text-xs text-destructive font-medium">Cancellation Reason</label>
                      <p className="text-sm">{o.cancellation_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tabs - Status, Notes, Timeline, Fulfillment */}
            <Tabs defaultValue="status" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="status">Status</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
              </TabsList>

              <TabsContent value="status" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Update Order Status</CardTitle>
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
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
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
                            <SelectItem value="returned">Returned</SelectItem>
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
                      <Button variant="outline" onClick={() => onSendNotification("status_change")}>
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
                    <CardTitle className="flex items-center justify-between text-base">
                      Order Notes
                      <Button variant="outline" size="sm" onClick={() => setEditingNotes(!editingNotes)}>
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
                        {!internalNotes && !customerNotes && (
                          <p className="text-sm text-muted-foreground">No notes yet</p>
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
                        <Button size="sm" onClick={() => handleAddNote("internal")} disabled={!newNote.trim()}>
                          Add Internal Note
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddNote("customer")}
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
                                <Badge variant={note.note_type === "internal" ? "default" : "secondary"}>
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
                    <CardTitle className="text-base">Fulfillment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Tracking Number</label>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-sm">
                              {o.tracking_number || "Not assigned"}
                            </p>
                            {o.tracking_number && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  copyToClipboard(o.tracking_number);
                                  toast({ title: "Copied", description: "Tracking number copied" });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Shipped Date</label>
                          <p className="text-sm mt-0.5">
                            {o.shipped_at ? new Date(o.shipped_at).toLocaleDateString("en-ZA") : "Not shipped"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Fulfillment Location</label>
                          <p className="text-sm mt-0.5">{o.fulfillment_location || "Default"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Delivery Status</label>
                          <p className="text-sm mt-0.5">
                            {o.delivered_at
                              ? `Delivered on ${new Date(o.delivered_at).toLocaleDateString("en-ZA")}`
                              : o.estimated_delivery_date
                              ? `Expected: ${new Date(o.estimated_delivery_date).toLocaleDateString("en-ZA")}`
                              : "Pending"}
                          </p>
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
              order={o}
              onStatusUpdate={onStatusUpdate}
              onSendNotification={onSendNotification}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
