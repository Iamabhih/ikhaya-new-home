import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Payment Reconciliation Function
 *
 * This function helps recover from scenarios where:
 * 1. PayFast payment was successful
 * 2. Pending order expired or was deleted
 * 3. Order was never created in the database
 *
 * It allows manual reconciliation by searching payment logs and attempting
 * to match orphaned payments with customer information.
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { action, orderNumber, paymentId } = await req.json();

    console.log('Reconciliation request:', { action, orderNumber, paymentId });

    // Action 1: List orphaned payments (payments without orders)
    if (action === 'list_orphaned') {
      const { data: orphanedPayments, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('event_type', 'pending_order_not_found')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching orphaned payments:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch orphaned payments' }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          orphanedPayments: orphanedPayments || [],
          count: orphanedPayments?.length || 0
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Action 2: Get payment details for reconciliation
    if (action === 'get_payment_details') {
      if (!orderNumber && !paymentId) {
        return new Response(
          JSON.stringify({ error: 'Either orderNumber or paymentId is required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      let query = supabase
        .from('payment_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderNumber) {
        query = query.eq('m_payment_id', orderNumber);
      } else if (paymentId) {
        query = query.eq('payment_id', paymentId);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching payment logs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payment logs' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber || logs?.[0]?.m_payment_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          paymentLogs: logs || [],
          orderExists: !!existingOrder,
          orderData: existingOrder
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Action 3: Manual recovery - create order from payment data
    if (action === 'manual_recovery') {
      if (!orderNumber) {
        return new Response(
          JSON.stringify({ error: 'orderNumber is required for manual recovery' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (existingOrder) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Order already exists',
            orderId: existingOrder.id
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      // Get payment logs to extract payment data
      const { data: paymentLogs } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('m_payment_id', orderNumber)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!paymentLogs || paymentLogs.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No payment logs found for this order number',
            recommendation: 'Cannot recover without payment data'
          }),
          { status: 404, headers: corsHeaders }
        );
      }

      const paymentLog = paymentLogs[0];

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Manual recovery requires customer data',
          details: 'Pending order data (customer info, cart items) is missing and cannot be recovered from payment logs alone.',
          recommendation: 'Contact customer to recreate the order, or issue a refund through PayFast dashboard.',
          paymentData: paymentLog.event_data,
          orderNumber: orderNumber
        }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Action 4: Generate reconciliation report
    if (action === 'generate_report') {
      const { data: allPaymentLogs } = await supabase
        .from('payment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      const orphanedCount = allPaymentLogs?.filter(log =>
        log.event_type === 'pending_order_not_found'
      ).length || 0;

      const successfulProcessing = allPaymentLogs?.filter(log =>
        log.event_type === 'processing_completed'
      ).length || 0;

      const failedProcessing = allPaymentLogs?.filter(log =>
        log.event_type === 'processing_failed'
      ).length || 0;

      const webhooksReceived = allPaymentLogs?.filter(log =>
        log.event_type === 'webhook_received'
      ).length || 0;

      return new Response(
        JSON.stringify({
          success: true,
          report: {
            totalEvents: allPaymentLogs?.length || 0,
            webhooksReceived,
            successfulProcessing,
            failedProcessing,
            orphanedPayments: orphanedCount,
            successRate: webhooksReceived > 0
              ? ((successfulProcessing / webhooksReceived) * 100).toFixed(2) + '%'
              : 'N/A'
          }
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid action',
        validActions: ['list_orphaned', 'get_payment_details', 'manual_recovery', 'generate_report']
      }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Reconciliation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: (error as Error).message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
