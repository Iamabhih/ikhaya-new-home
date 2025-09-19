import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecoveryOrderData {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  paymentReference: string;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress?: {
    address: string;
    city: string;
    postalCode: string;
    phone: string;
  };
}

export function useOrderRecovery() {
  const [isCreating, setIsCreating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const createOrderFromPayment = async (orderData: RecoveryOrderData) => {
    setIsCreating(true);
    try {
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('order_number', orderData.orderNumber)
        .single();

      if (existingOrder) {
        toast.error(`Order ${orderData.orderNumber} already exists`);
        return null;
      }

      // Check if user exists or create one
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', orderData.customerEmail)
        .single();

      let userId = existingProfile?.id;

      if (!userId) {
        const nameParts = orderData.customerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: newUserId, error: createUserError } = await supabase
          .rpc('create_user_from_order', {
            p_email: orderData.customerEmail,
            p_first_name: firstName,
            p_last_name: lastName
          });

        if (createUserError) {
          throw createUserError;
        }
        userId = newUserId;
      }

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingAmount = orderData.totalAmount - subtotal;

      // Create the order
      const newOrderData = {
        order_number: orderData.orderNumber,
        user_id: userId,
        email: orderData.customerEmail,
        status: 'processing' as const,
        payment_status: 'paid',
        payment_method: orderData.paymentMethod,
        payment_gateway: 'payfast',
        payment_reference: orderData.paymentReference,
        subtotal,
        shipping_amount: Math.max(0, shippingAmount),
        total_amount: orderData.totalAmount,
        currency: 'ZAR',
        billing_address: {
          first_name: orderData.customerName.split(' ')[0] || '',
          last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
          email: orderData.customerEmail,
          phone: orderData.shippingAddress?.phone || '',
          address_line_1: orderData.shippingAddress?.address || '',
          city: orderData.shippingAddress?.city || '',
          postal_code: orderData.shippingAddress?.postalCode || '',
          country: 'South Africa'
        },
        shipping_address: orderData.shippingAddress ? {
          first_name: orderData.customerName.split(' ')[0] || '',
          last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
          phone: orderData.shippingAddress.phone,
          address_line_1: orderData.shippingAddress.address,
          city: orderData.shippingAddress.city,
          postal_code: orderData.shippingAddress.postalCode,
          country: 'South Africa'
        } : null,
        notes: 'Order created manually from payment recovery',
        source_channel: 'payment_recovery'
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(newOrderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_name: item.name,
        product_sku: item.sku || '',
        unit_price: item.price,
        quantity: item.quantity,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Log analytics event
      await supabase.from('analytics_events').insert({
        event_type: 'admin_action',
        event_name: 'order_recovered',
        metadata: {
          order_id: order.id,
          order_number: orderData.orderNumber,
          total_amount: orderData.totalAmount,
          recovery_method: 'manual_creation'
        }
      });

      toast.success(`Order ${orderData.orderNumber} created successfully!`);
      return order;

    } catch (error: any) {
      console.error('Error creating recovery order:', error);
      toast.error(`Failed to create order: ${error.message}`);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const linkAnonymousOrders = async (email: string, userId?: string) => {
    if (!userId) {
      toast.error('User ID required for linking orders');
      return 0;
    }

    setIsLinking(true);
    try {
      const { data: linkedCount, error } = await supabase
        .rpc('link_anonymous_orders_to_user', {
          p_user_id: userId,
          p_email: email
        });

      if (error) throw error;

      if (linkedCount > 0) {
        toast.success(`Successfully linked ${linkedCount} orders to user account`);
      } else {
        toast.info('No anonymous orders found to link');
      }

      return linkedCount;

    } catch (error: any) {
      console.error('Error linking orders:', error);
      toast.error(`Failed to link orders: ${error.message}`);
      return 0;
    } finally {
      setIsLinking(false);
    }
  };

  return {
    createOrderFromPayment,
    linkAnonymousOrders,
    isCreating,
    isLinking
  };
}