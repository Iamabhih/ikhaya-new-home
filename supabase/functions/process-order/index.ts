import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { orderNumber, source, paymentData } = await req.json();

    console.log('Processing order:', { orderNumber, source });

    // Helper function to log to payment_logs
    const logPaymentEvent = async (eventType: string, eventData?: any, errorMessage?: string, errorDetails?: any) => {
      try {
        await supabase.from('payment_logs').insert({
          payment_id: paymentData?.payment_id || orderNumber,
          m_payment_id: orderNumber,
          pf_payment_id: paymentData?.pf_payment_id,
          payment_status: paymentData?.payment_status || 'unknown',
          event_type: eventType,
          event_data: eventData,
          error_message: errorMessage,
          error_details: errorDetails
        });
      } catch (logError) {
        console.error('Failed to log payment event:', logError);
      }
    };

    await logPaymentEvent('processing_started', { source, paymentData });

    if (!orderNumber) {
      await logPaymentEvent('processing_failed', null, 'Order number is required');
      return new Response(
        JSON.stringify({ error: 'Order number is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if order already exists (idempotency)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingOrder) {
      console.log('Order already exists:', existingOrder);
      await logPaymentEvent('order_created', { orderId: existingOrder.id, note: 'Order already existed' });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order already processed',
          orderId: existingOrder.id
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Get pending order
    const { data: pendingOrder, error: pendingError } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (pendingError || !pendingOrder) {
      console.error('Pending order not found:', pendingError);

      // Log this critical error
      await logPaymentEvent(
        'pending_order_not_found',
        { orderNumber, source },
        'Pending order not found - possible expiration or missing data',
        {
          error: pendingError?.message,
          searchedOrderNumber: orderNumber,
          timestamp: new Date().toISOString(),
          recommendation: 'Check if pending order expired or was never created. Payment may need manual reconciliation.'
        }
      );

      return new Response(
        JSON.stringify({
          error: 'Pending order not found',
          details: 'The order data may have expired or was not properly created. Please contact support with your payment reference.',
          orderNumber: orderNumber
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('Found pending order:', pendingOrder.id);

    // Extract form data with safe defaults
    const formData = pendingOrder.form_data || {};
    const cartData = pendingOrder.cart_data || { items: [], total: 0 };
    const deliveryData = pendingOrder.delivery_data || { fee: 0, method: 'standard' };

    // Build address object for both billing and shipping
    const addressData = {
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      city: formData.city || '',
      postalCode: formData.postalCode || '',
      province: formData.province || '',
    };

    // Calculate subtotal (cart total before delivery fee)
    const subtotal = cartData.total || 0;
    const shippingAmount = deliveryData.fee || 0;

    // Use transaction wrapper for atomic order creation
    const { data: transactionResult, error: transactionError } = await supabase.rpc(
      'create_order_transaction',
      {
        p_order_number: orderNumber,
        p_user_id: pendingOrder.user_id,
        p_order_data: {
          email: formData.email,
          subtotal: subtotal,
          shipping_amount: shippingAmount,
          total_amount: pendingOrder.total_amount,
          billing_address: addressData,
          shipping_address: addressData,
          delivery_info: {
            fee: shippingAmount,
            method: deliveryData.method || 'standard'
          },
          payment_method: 'payfast',
          payment_gateway: 'payfast',
          payment_data: paymentData || {},
          customer_notes: formData.notes || `Order processed via ${source}`,
          source_channel: 'web'
        },
        p_order_items: (cartData.items || []).map((item: any) => ({
          product_id: item.product?.id || item.productId,
          product_name: item.product?.name || item.name || 'Unknown Product',
          product_sku: item.product?.sku || item.sku || null,
          quantity: item.quantity || 1,
          unit_price: item.product?.price || item.price || 0,
          total_price: (item.product?.price || item.price || 0) * (item.quantity || 1),
        })),
        p_pending_order_id: pendingOrder.id
      }
    );

    if (transactionError) {
      console.error('Transaction failed:', transactionError);
      await logPaymentEvent(
        'order_failed',
        { orderNumber },
        'Order creation transaction failed',
        { error: transactionError.message, details: transactionError }
      );

      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: transactionError.message
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse result (may be string or object)
    const orderResult = typeof transactionResult === 'string'
      ? JSON.parse(transactionResult)
      : transactionResult;

    if (!orderResult.success) {
      console.error('Order creation failed:', orderResult.error);
      await logPaymentEvent(
        'order_failed',
        { orderNumber },
        orderResult.error,
        orderResult
      );

      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: orderResult.error
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Order created successfully:', orderResult.order_id);
    await logPaymentEvent('order_created', {
      orderId: orderResult.order_id,
      orderNumber: orderResult.order_number
    });

    // Send confirmation email (non-critical - don't fail if it errors)
    try {
      const { error: emailError } = await supabase.functions.invoke('send-order-confirmation', {
        body: {
          orderNumber: orderResult.order_number,
          customerEmail: formData.email,
          orderId: orderResult.order_id
        }
      });

      if (emailError) {
        console.error('Email send failed (non-critical):', emailError);
      }
    } catch (emailError) {
      console.error('Email service error (non-critical):', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderResult.order_id,
        orderNumber: orderResult.order_number,
        message: 'Order processed successfully'
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Process order error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: (error as Error).message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
