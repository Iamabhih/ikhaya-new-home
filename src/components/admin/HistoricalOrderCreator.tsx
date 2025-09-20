import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, CheckCircle, Loader2, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const HISTORICAL_ORDER_DATA = {
  orderNumber: 'IKH-20250915-249240509',
  customerEmail: 'luhlebp@gmail.com',
  customerFirstName: 'Bongiwe',
  customerLastName: 'Mtshali',
  customerPhone: '0761342177',
  customerAddress: 'Magogo primary school, Nquthu',
  customerCity: 'Nquthu',
  customerPostalCode: '',
  customerProvince: 'KwaZulu-Natal',
  paymentMethod: 'payfast',
  paymentStatus: 'paid',
  paymentReference: '249240509',
  orderDate: '2025-09-15T15:58:00Z',
  subtotal: 2492.12,
  shippingAmount: 0,
  totalAmount: 2492.12,
  deliveryType: 'National Delivery',
  items: [
    { name: 'CONT+LID WHEELS 45LT RAS', qty: 1, price: 72.95, unitPrice: 72.95 },
    { name: 'CONT+LID WHEELS 85LT', qty: 1, price: 93.95, unitPrice: 93.95 },
    { name: 'MEASURING SET 10PC 53546', qty: 1, price: 29.94, unitPrice: 29.94 },
    { name: 'TUMBLER HIBALL PRESSED 48S AK', qty: 1, price: 347.93, unitPrice: 347.93 },
    { name: 'PLATE DINNER WHITE CATERING', qty: 30, price: 466.20, unitPrice: 15.54 },
    { name: 'MUG 16OZ WHITE SOUP', qty: 30, price: 430.20, unitPrice: 14.34 },
    { name: 'OTIMA TEA/COFFEE/SUGAR', qty: 2, price: 49.90, unitPrice: 24.95 },
    { name: 'APP-BROOM & MOP(200GR) COMBO', qty: 2, price: 95.88, unitPrice: 47.94 },
    { name: 'BASIN 46CM 12 SIDED IKHAYA', qty: 8, price: 95.60, unitPrice: 11.95 },
    { name: 'GRATER 6 SIDED S/S IKHAYA', qty: 2, price: 91.08, unitPrice: 45.54 },
    { name: 'BATH OVAL 50LT RAS', qty: 5, price: 149.75, unitPrice: 29.95 },
    { name: 'IKHAYA SCOOP 1.5LT COLOUR', qty: 5, price: 32.50, unitPrice: 6.50 },
    { name: 'MARBLE-BOWL 6.5 SQR R/GLAZE', qty: 5, price: 173.70, unitPrice: 34.74 },
    { name: 'BIN REFUSE 75LT BLACK BUZZ', qty: 1, price: 122.95, unitPrice: 122.95 },
    { name: 'BAKING SET 3PC SILICONE 71827', qty: 1, price: 47.94, unitPrice: 47.94 },
    { name: 'BOWL STACK WHITE 4" 52746', qty: 10, price: 71.40, unitPrice: 7.14 },
    { name: 'BOWL+LID 15CM SILKY 3\'S IKHAYA', qty: 3, price: 39.75, unitPrice: 13.25 },
    { name: 'IKHAYA JUG 1.5LT ASST COL', qty: 5, price: 25.00, unitPrice: 5.00 },
    { name: 'IKHAYA JUG+LID 2LT COLOUR', qty: 2, price: 15.00, unitPrice: 7.50 },
    { name: 'IKHAYA JUG+LID 3LT COLOUR', qty: 3, price: 40.50, unitPrice: 13.50 }
  ]
};

export function HistoricalOrderCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const createHistoricalOrder = async () => {
    setIsCreating(true);
    try {
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('order_number', HISTORICAL_ORDER_DATA.orderNumber)
        .single();

      if (existingOrder) {
        toast.error(`Order ${HISTORICAL_ORDER_DATA.orderNumber} already exists`);
        return;
      }

      // Check if user exists or create one
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', HISTORICAL_ORDER_DATA.customerEmail)
        .single();

      let userId = existingProfile?.id;

      if (!userId) {
        const { data: newUserId, error: createUserError } = await supabase
          .rpc('create_user_from_order', {
            p_email: HISTORICAL_ORDER_DATA.customerEmail,
            p_first_name: HISTORICAL_ORDER_DATA.customerFirstName,
            p_last_name: HISTORICAL_ORDER_DATA.customerLastName
          });

        if (createUserError) {
          throw createUserError;
        }
        userId = newUserId;
      }

      // Create the historical order with proper timestamps
      const orderData = {
        order_number: HISTORICAL_ORDER_DATA.orderNumber,
        user_id: userId,
        email: HISTORICAL_ORDER_DATA.customerEmail,
        status: 'delivered' as const,
        payment_status: HISTORICAL_ORDER_DATA.paymentStatus,
        payment_method: HISTORICAL_ORDER_DATA.paymentMethod,
        payment_gateway: 'payfast',
        payment_reference: HISTORICAL_ORDER_DATA.paymentReference,
        subtotal: HISTORICAL_ORDER_DATA.subtotal,
        shipping_amount: HISTORICAL_ORDER_DATA.shippingAmount,
        total_amount: HISTORICAL_ORDER_DATA.totalAmount,
        currency: 'ZAR',
        billing_address: {
          first_name: HISTORICAL_ORDER_DATA.customerFirstName,
          last_name: HISTORICAL_ORDER_DATA.customerLastName,
          email: HISTORICAL_ORDER_DATA.customerEmail,
          phone: HISTORICAL_ORDER_DATA.customerPhone,
          address_line_1: HISTORICAL_ORDER_DATA.customerAddress,
          city: HISTORICAL_ORDER_DATA.customerCity,
          postal_code: HISTORICAL_ORDER_DATA.customerPostalCode,
          country: 'South Africa'
        },
        shipping_address: {
          first_name: HISTORICAL_ORDER_DATA.customerFirstName,
          last_name: HISTORICAL_ORDER_DATA.customerLastName,
          phone: HISTORICAL_ORDER_DATA.customerPhone,
          address_line_1: HISTORICAL_ORDER_DATA.customerAddress,
          city: HISTORICAL_ORDER_DATA.customerCity,
          postal_code: HISTORICAL_ORDER_DATA.customerPostalCode,
          country: 'South Africa'
        },
        notes: `Historical order created - Original date: ${HISTORICAL_ORDER_DATA.orderDate}. Delivery: ${HISTORICAL_ORDER_DATA.deliveryType} (Free delivery applied)`,
        source_channel: 'historical_recovery',
        created_at: HISTORICAL_ORDER_DATA.orderDate,
        updated_at: HISTORICAL_ORDER_DATA.orderDate,
        shipped_at: '2025-09-16T09:00:00Z',
        delivered_at: '2025-09-18T14:00:00Z'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = HISTORICAL_ORDER_DATA.items.map(item => ({
        order_id: order.id,
        product_name: item.name,
        product_sku: '', // We'll look up SKUs if needed
        unit_price: item.unitPrice,
        quantity: item.qty,
        total_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create order timeline entries for historical tracking
      const timelineEntries = [
        {
          order_id: order.id,
          event_type: 'created',
          event_title: 'Order placed',
          event_description: 'Historical order placed by customer',
          created_at: HISTORICAL_ORDER_DATA.orderDate
        },
        {
          order_id: order.id,
          event_type: 'payment_confirmed',
          event_title: 'Payment confirmed',
          event_description: `PayFast payment confirmed - Reference: ${HISTORICAL_ORDER_DATA.paymentReference}`,
          created_at: '2025-09-15T16:00:00Z'
        },
        {
          order_id: order.id,
          event_type: 'shipped',
          event_title: 'Order shipped',
          event_description: 'Order dispatched for delivery',
          created_at: '2025-09-16T09:00:00Z'
        },
        {
          order_id: order.id,
          event_type: 'delivered',
          event_title: 'Order delivered',
          event_description: 'Order successfully delivered to customer',
          created_at: '2025-09-18T14:00:00Z'
        }
      ];

      const { error: timelineError } = await supabase
        .from('order_timeline')
        .insert(timelineEntries);

      if (timelineError) {
        console.warn('Timeline creation failed:', timelineError);
      }

      // Log analytics events
      await supabase.from('analytics_events').insert([
        {
          event_type: 'purchase',
          event_name: 'historical_order_recovered',
          order_id: order.id,
          metadata: {
            order_id: order.id,
            order_number: HISTORICAL_ORDER_DATA.orderNumber,
            total_amount: HISTORICAL_ORDER_DATA.totalAmount,
            recovery_method: 'manual_historical',
            original_date: HISTORICAL_ORDER_DATA.orderDate
          },
          created_at: HISTORICAL_ORDER_DATA.orderDate
        },
        {
          event_type: 'admin_action',
          event_name: 'historical_order_created',
          metadata: {
            order_id: order.id,
            order_number: HISTORICAL_ORDER_DATA.orderNumber,
            total_amount: HISTORICAL_ORDER_DATA.totalAmount,
            customer_email: HISTORICAL_ORDER_DATA.customerEmail
          }
        }
      ]);

      toast.success(`Historical order ${HISTORICAL_ORDER_DATA.orderNumber} created successfully!`);
      setOrderCreated(true);

    } catch (error: any) {
      console.error('Error creating historical order:', error);
      toast.error(`Failed to create historical order: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (orderCreated) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Historical Order Created Successfully
          </CardTitle>
          <CardDescription>
            Order {HISTORICAL_ORDER_DATA.orderNumber} has been added to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              The historical order has been created with proper timestamps and analytics tracking. 
              The order can now be found in the admin dashboard and customer order history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create Historical Order - September 15th, 2025
        </CardTitle>
        <CardDescription>
          Add the PayFast order (Ref: {HISTORICAL_ORDER_DATA.paymentReference}) from September 15th to the system
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create a historical order for Bongiwe Mtshali placed on September 15th, 2025 at 15:58.
            The order will be marked as delivered and include proper timeline entries.
          </AlertDescription>
        </Alert>

        {/* Order Summary */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-mono">{HISTORICAL_ORDER_DATA.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PayFast Reference:</span>
                <span className="font-mono">{HISTORICAL_ORDER_DATA.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>September 15th, 2025 at 15:58</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery:</span>
                <Badge variant="secondary">{HISTORICAL_ORDER_DATA.deliveryType} - Free</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{HISTORICAL_ORDER_DATA.customerFirstName} {HISTORICAL_ORDER_DATA.customerLastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{HISTORICAL_ORDER_DATA.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span>{HISTORICAL_ORDER_DATA.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address:</span>
                <span>{HISTORICAL_ORDER_DATA.customerAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Order Items ({HISTORICAL_ORDER_DATA.items.length} products)</h3>
          </div>
          
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {HISTORICAL_ORDER_DATA.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b pb-2">
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-2">Qty: {item.qty}</span>
                  </div>
                  <span className="font-mono">R{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Totals */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount:</span>
            <span className="font-mono">R{HISTORICAL_ORDER_DATA.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={createHistoricalOrder}
            disabled={isCreating}
            size="lg"
            className="min-w-48"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Historical Order...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Create Historical Order
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}