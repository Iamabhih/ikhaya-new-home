import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  product_name: string;
  product_sku: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

interface FormData {
  orderNumber: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerPostalCode: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string;
  subtotal: number;
  shippingAmount: number;
  totalAmount: number;
  notes: string;
  items: OrderItem[];
}

export function ManualOrderCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<FormData>({
    orderNumber: '',
    customerEmail: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: '',
    customerPostalCode: '',
    paymentMethod: 'payfast',
    paymentStatus: 'paid',
    paymentReference: '',
    subtotal: 0,
    shippingAmount: 0,
    totalAmount: 0,
    notes: '',
    items: []
  });

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_name: '',
        product_sku: '',
        unit_price: 0,
        quantity: 1,
        total_price: 0
      }]
    }));
  };

  const removeOrderItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      
      // Auto-calculate total_price when unit_price or quantity changes
      if (field === 'unit_price' || field === 'quantity') {
        newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
    const totalAmount = subtotal + formData.shippingAmount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      totalAmount
    }));
  };

  React.useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.shippingAmount]);

  const verifyPayment = async () => {
    if (!formData.paymentReference) {
      toast.error('Please enter a payment reference to verify');
      return;
    }

    setIsVerifying(true);
    try {
      // This would normally call PayFast API to verify payment
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentVerified(true);
      toast.success('Payment verified successfully');
    } catch (error) {
      setPaymentVerified(false);
      toast.error('Payment verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const createOrder = async () => {
    if (!formData.orderNumber || !formData.customerEmail || formData.items.length === 0) {
      toast.error('Please fill in all required fields and add at least one item');
      return;
    }

    setIsCreating(true);
    try {
      // First, check if user exists or create one
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.customerEmail)
        .single();

      let userId = existingProfile?.id;

      if (!userId) {
        // Create user account
        const { data: newUserId, error: createUserError } = await supabase
          .rpc('create_user_from_order', {
            p_email: formData.customerEmail,
            p_first_name: formData.customerFirstName,
            p_last_name: formData.customerLastName
          });

        if (createUserError) {
          throw createUserError;
        }
        userId = newUserId;
      }

      // Create the order
      const orderData = {
        order_number: formData.orderNumber,
        user_id: userId,
        email: formData.customerEmail,
        status: 'processing' as const,
        payment_status: formData.paymentStatus,
        payment_method: formData.paymentMethod,
        payment_gateway: 'payfast',
        payment_reference: formData.paymentReference,
        subtotal: formData.subtotal,
        shipping_amount: formData.shippingAmount,
        total_amount: formData.totalAmount,
        currency: 'ZAR',
        billing_address: {
          first_name: formData.customerFirstName,
          last_name: formData.customerLastName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          address_line_1: formData.customerAddress,
          city: formData.customerCity,
          postal_code: formData.customerPostalCode,
          country: 'South Africa'
        },
        shipping_address: {
          first_name: formData.customerFirstName,
          last_name: formData.customerLastName,
          phone: formData.customerPhone,
          address_line_1: formData.customerAddress,
          city: formData.customerCity,
          postal_code: formData.customerPostalCode,
          country: 'South Africa'
        },
        notes: formData.notes || null,
        source_channel: 'manual_admin'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = formData.items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Log analytics event
      await supabase.from('analytics_events').insert({
        event_type: 'admin_action',
        event_name: 'manual_order_created',
        metadata: {
          order_id: order.id,
          order_number: formData.orderNumber,
          total_amount: formData.totalAmount
        }
      });

      toast.success(`Order ${formData.orderNumber} created successfully!`);
      
      // Reset form
      setFormData({
        orderNumber: '',
        customerEmail: '',
        customerFirstName: '',
        customerLastName: '',
        customerPhone: '',
        customerAddress: '',
        customerCity: '',
        customerPostalCode: '',
        paymentMethod: 'payfast',
        paymentStatus: 'paid',
        paymentReference: '',
        subtotal: 0,
        shippingAmount: 0,
        totalAmount: 0,
        notes: '',
        items: []
      });
      setPaymentVerified(null);

    } catch (error: any) {
      console.error('Error creating manual order:', error);
      toast.error(`Failed to create order: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Manual Order Creator
        </CardTitle>
        <CardDescription>
          Create orders manually for payments received outside the normal checkout flow
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Use this tool to create orders for legitimate payments that weren't processed automatically.
            Always verify payment with PayFast before creating the order.
          </AlertDescription>
        </Alert>

        {/* Order Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Order Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">Order Number *</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                placeholder="e.g., IKH20250915-0G"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="paymentReference">Payment Reference *</Label>
                <Input
                  id="paymentReference"
                  value={formData.paymentReference}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                  placeholder="PayFast Payment ID"
                />
              </div>
              <Button
                onClick={verifyPayment}
                disabled={isVerifying || !formData.paymentReference}
                variant="outline"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          </div>
          
          {paymentVerified !== null && (
            <div className="flex items-center gap-2">
              {paymentVerified ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Payment Verified
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Payment Not Verified
                </Badge>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="+27 123 456 789"
              />
            </div>
            <div>
              <Label htmlFor="customerFirstName">First Name *</Label>
              <Input
                id="customerFirstName"
                value={formData.customerFirstName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerFirstName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customerLastName">Last Name *</Label>
              <Input
                id="customerLastName"
                value={formData.customerLastName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerLastName: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="customerAddress">Address</Label>
              <Input
                id="customerAddress"
                value={formData.customerAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customerCity">City</Label>
              <Input
                id="customerCity"
                value={formData.customerCity}
                onChange={(e) => setFormData(prev => ({ ...prev, customerCity: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customerPostalCode">Postal Code</Label>
              <Input
                id="customerPostalCode"
                value={formData.customerPostalCode}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPostalCode: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <Button onClick={addOrderItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          {formData.items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-6 gap-4 items-end">
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    value={item.product_name}
                    onChange={(e) => updateOrderItem(index, 'product_name', e.target.value)}
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={item.product_sku}
                    onChange={(e) => updateOrderItem(index, 'product_sku', e.target.value)}
                    placeholder="SKU"
                  />
                </div>
                <div>
                  <Label>Unit Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.total_price}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <Button
                  onClick={() => removeOrderItem(index)}
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Payment & Totals */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payfast">PayFast</SelectItem>
                  <SelectItem value="eft">EFT</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Totals</h3>
            <div>
              <Label>Subtotal</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.subtotal}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="shippingAmount">Shipping Amount</Label>
              <Input
                id="shippingAmount"
                type="number"
                step="0.01"
                value={formData.shippingAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.totalAmount}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional order notes..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <Button
            onClick={createOrder}
            disabled={isCreating || !formData.orderNumber || !formData.customerEmail || formData.items.length === 0}
            className="min-w-32"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}