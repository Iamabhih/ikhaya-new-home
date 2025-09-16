import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingOrderData {
  orderNumber: string;
  userId?: string;
  cartData: {
    items: any[];
    subtotal: number;
  };
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  deliveryData: {
    option: string;
    fee: number;
  };
  totalAmount: number;
}

export const usePendingOrder = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const storePendingOrder = async (orderData: PendingOrderData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pending_orders')
        .insert({
          order_number: orderData.orderNumber,
          user_id: orderData.userId || user?.id,
          cart_data: orderData.cartData,
          form_data: orderData.formData,
          delivery_data: orderData.deliveryData,
          total_amount: orderData.totalAmount
        });

      if (error) {
        console.error('Error storing pending order:', error);
        toast.error('Failed to store order data');
        return false;
      }

      console.log('Pending order stored successfully:', orderData.orderNumber);
      return true;
    } catch (error) {
      console.error('Error storing pending order:', error);
      toast.error('Failed to store order data');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPendingOrder = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (error) {
        console.error('Error fetching pending order:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching pending order:', error);
      return null;
    }
  };

  const clearPendingOrder = async (orderNumber: string) => {
    try {
      const { error } = await supabase
        .from('pending_orders')
        .delete()
        .eq('order_number', orderNumber);

      if (error) {
        console.error('Error clearing pending order:', error);
      }
    } catch (error) {
      console.error('Error clearing pending order:', error);
    }
  };

  return {
    storePendingOrder,
    getPendingOrder,
    clearPendingOrder,
    loading
  };
};