import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseOrderRealtimeOptions {
  userId?: string;
  orderId?: string | null;
  isAdmin?: boolean;
  onNewOrder?: (order: any) => void;
  onStatusChange?: (order: any) => void;
}

export const useOrderRealtime = (
  optionsOrOrderId?: UseOrderRealtimeOptions | string | null
) => {
  // Handle both object options and simple orderId string
  let options: UseOrderRealtimeOptions;
  if (typeof optionsOrOrderId === 'string') {
    options = { orderId: optionsOrOrderId };
  } else if (optionsOrOrderId === null) {
    options = { orderId: undefined };
  } else {
    options = optionsOrOrderId || {};
  }
    
  const { userId, orderId, isAdmin = false, onNewOrder, onStatusChange } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Build filter for the channel
    const filter = orderId
      ? `id=eq.${orderId}`
      : isAdmin 
        ? undefined 
        : userId 
          ? `user_id=eq.${userId}` 
          : undefined;

    const channel = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          console.log('New order received:', payload);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
          if (orderId) queryClient.invalidateQueries({ queryKey: ['customer-order', orderId] });

          // Play sound for admin
          if (isAdmin) {
            try {
              const audio = new Audio('/audio/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {
              console.log('Audio not available');
            }
          }

          // Show toast
          toast({
            title: "New Order Received!",
            description: `Order #${payload.new.order_number} has been placed`,
          });

          onNewOrder?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          console.log('Order updated:', payload);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
          if (orderId) queryClient.invalidateQueries({ queryKey: ['customer-order', orderId] });

          // Check if status changed
          if (payload.old.status !== payload.new.status) {
            toast({
              title: "Order Status Updated",
              description: `Order #${payload.new.order_number}: ${payload.old.status} → ${payload.new.status}`,
            });

            onStatusChange?.(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, orderId, isAdmin, queryClient, toast, onNewOrder, onStatusChange]);
};
