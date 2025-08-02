import { supabase } from "@/integrations/supabase/client";

interface PendingOrderData {
  tempOrderId: string;
  user_id: string | null;
  email: string;
  billing_address: any;
  shipping_address: any;
  subtotal: number;
  shipping_amount: number;
  total_amount: number;
  cartItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_name: string;
    product_sku?: string;
  }>;
}

export class OrderCreationService {
  /**
   * Creates an order from pending order data stored in sessionStorage
   */
  static async createOrderFromPendingData(tempOrderId: string, paymentReference: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Get pending order data from sessionStorage
      const pendingDataJson = sessionStorage.getItem(`pending_order_${tempOrderId}`);
      if (!pendingDataJson) {
        console.error('No pending order data found for temp ID:', tempOrderId);
        return { success: false, error: 'Pending order data not found' };
      }

      const pendingData: PendingOrderData = JSON.parse(pendingDataJson);
      
      // Generate final order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Create the order
      const orderCreateData = {
        user_id: pendingData.user_id,
        email: pendingData.email,
        order_number: orderNumber,
        billing_address: pendingData.billing_address,
        shipping_address: pendingData.shipping_address,
        subtotal: pendingData.subtotal,
        shipping_amount: pendingData.shipping_amount,
        total_amount: pendingData.total_amount,
        status: 'confirmed' as const,
        payment_status: 'paid' as const,
        payment_gateway: 'payfast',
        payment_reference: paymentReference
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderCreateData)
        .select()
        .single();

      if (orderError) {
        console.error('Failed to create order:', orderError);
        return { success: false, error: orderError.message };
      }

      // Create order items
      const orderItems = pendingData.cartItems.map(item => ({
        ...item,
        order_id: order.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to create order items:', itemsError);
        // Try to clean up the order
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: itemsError.message };
      }

      // Clean up sessionStorage
      sessionStorage.removeItem(`pending_order_${tempOrderId}`);
      
      console.log('Order created successfully:', order.id);
      return { success: true, orderId: order.id };

    } catch (error) {
      console.error('Error creating order from pending data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Cleans up expired pending orders from sessionStorage
   */
  static cleanupExpiredPendingOrders(): void {
    try {
      const keys = Object.keys(sessionStorage);
      const pendingOrderKeys = keys.filter(key => key.startsWith('pending_order_'));
      
      pendingOrderKeys.forEach(key => {
        try {
          const data = JSON.parse(sessionStorage.getItem(key) || '{}');
          const tempOrderId = data.tempOrderId || '';
          
          // Extract timestamp from temp order ID (format: TEMP-{timestamp}-{random})
          const timestamp = parseInt(tempOrderId.split('-')[1]);
          const now = Date.now();
          
          // Remove orders older than 1 hour
          if (now - timestamp > 60 * 60 * 1000) {
            sessionStorage.removeItem(key);
            console.log('Cleaned up expired pending order:', key);
          }
        } catch (e) {
          // Invalid data, remove it
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error cleaning up pending orders:', error);
    }
  }
}