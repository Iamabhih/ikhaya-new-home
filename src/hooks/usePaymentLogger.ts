import { supabase } from "@/integrations/supabase/client";

type PaymentEventType = 
  | 'payment_initiated'
  | 'pending_order_created'
  | 'pending_order_failed'
  | 'form_prepared'
  | 'form_submitted'
  | 'payment_cancelled'
  | 'payment_success_page'
  | 'client_error';

interface PaymentEventData {
  orderNumber?: string;
  amount?: number;
  userId?: string;
  email?: string;
  cartItems?: number;
  [key: string]: any;
}

export const usePaymentLogger = () => {
  const logPaymentEvent = async (
    eventType: PaymentEventType,
    data: PaymentEventData,
    errorMessage?: string
  ) => {
    try {
      const { error } = await supabase.from('payment_logs').insert({
        m_payment_id: data.orderNumber || null,
        payment_status: data.status || 'pending',
        event_type: eventType,
        event_data: data,
        error_message: errorMessage || null,
        ip_address: null // Could be captured server-side if needed
      });

      if (error) {
        console.error('[PaymentLogger] Failed to log event:', error);
      } else {
        console.log(`[PaymentLogger] Event logged: ${eventType}`, data);
      }
    } catch (err) {
      console.error('[PaymentLogger] Exception logging event:', err);
    }
  };

  const logPaymentInitiated = (data: PaymentEventData) => 
    logPaymentEvent('payment_initiated', data);

  const logPendingOrderCreated = (data: PaymentEventData) => 
    logPaymentEvent('pending_order_created', data);

  const logPendingOrderFailed = (data: PaymentEventData, error: string) => 
    logPaymentEvent('pending_order_failed', data, error);

  const logFormPrepared = (data: PaymentEventData) => 
    logPaymentEvent('form_prepared', data);

  const logFormSubmitted = (data: PaymentEventData) => 
    logPaymentEvent('form_submitted', data);

  const logPaymentCancelled = (data: PaymentEventData) => 
    logPaymentEvent('payment_cancelled', data);

  const logPaymentSuccessPage = (data: PaymentEventData) => 
    logPaymentEvent('payment_success_page', data);

  const logClientError = (data: PaymentEventData, error: string) => 
    logPaymentEvent('client_error', data, error);

  return {
    logPaymentEvent,
    logPaymentInitiated,
    logPendingOrderCreated,
    logPendingOrderFailed,
    logFormPrepared,
    logFormSubmitted,
    logPaymentCancelled,
    logPaymentSuccessPage,
    logClientError
  };
};
