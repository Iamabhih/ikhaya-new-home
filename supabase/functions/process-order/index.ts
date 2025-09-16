import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== Order Processing Function Called ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderNumber, source = 'unknown', paymentData = null } = await req.json();

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Order number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing order:', orderNumber, 'from source:', source);

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, order_number')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingOrder) {
      console.log('Order already exists:', existingOrder.id);
      
      // If it's a webhook confirmation, update payment status
      if (source === 'webhook' && paymentData?.payment_status === 'COMPLETE') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_reference: paymentData.pf_payment_id,
            payment_gateway_response: paymentData,
            status: 'confirmed'
          })
          .eq('id', existingOrder.id);

        if (updateError) {
          console.error('Error updating order payment status:', updateError);
        } else {
          console.log('Payment confirmed for existing order:', existingOrder.id);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: existingOrder.id,
          status: 'exists',
          message: 'Order already processed'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get pending order data
    const { data: pendingOrder, error: pendingError } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (pendingError) {
      console.error('Error fetching pending order:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending order data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingOrder) {
      console.error('No pending order found for:', orderNumber);
      return new Response(
        JSON.stringify({ error: 'No pending order data found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found pending order, creating full order...');

    // Create complete order from pending data
    const orderData = {
      order_number: orderNumber,
      user_id: pendingOrder.user_id,
      email: pendingOrder.form_data.email,
      subtotal: pendingOrder.cart_data.subtotal,
      shipping_amount: pendingOrder.delivery_data.fee,
      total_amount: pendingOrder.total_amount,
      status: source === 'webhook' && paymentData?.payment_status === 'COMPLETE' ? 'confirmed' : 'processing',
      payment_status: source === 'webhook' && paymentData?.payment_status === 'COMPLETE' ? 'paid' : 'pending',
      payment_gateway: 'payfast',
      payment_reference: paymentData?.pf_payment_id,
      payment_gateway_response: paymentData,
      billing_address: {
        first_name: pendingOrder.form_data.firstName,
        last_name: pendingOrder.form_data.lastName,
        email: pendingOrder.form_data.email,
        phone: pendingOrder.form_data.phone,
        address: pendingOrder.form_data.address,
        city: pendingOrder.form_data.city,
        province: pendingOrder.form_data.province,
        postal_code: pendingOrder.form_data.postalCode
      },
      shipping_address: {
        first_name: pendingOrder.form_data.firstName,
        last_name: pendingOrder.form_data.lastName,
        email: pendingOrder.form_data.email,
        phone: pendingOrder.form_data.phone,
        address: pendingOrder.form_data.address,
        city: pendingOrder.form_data.city,
        province: pendingOrder.form_data.province,
        postal_code: pendingOrder.form_data.postalCode
      }
    };

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', order.id);

    // Create order items
    const orderItems = pendingOrder.cart_data.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id || item.product?.id,
      quantity: item.quantity,
      unit_price: item.product?.price || 0,
      total_price: (item.product?.price || 0) * item.quantity,
      product_name: item.product?.name || 'Product',
      product_sku: item.product?.sku || null
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Don't fail the entire order, but log the error
    } else {
      console.log('Order items created successfully');
    }

    // Track analytics event for completed purchase
    if (order.status === 'confirmed' || order.payment_status === 'paid') {
      try {
        await supabase.from('analytics_events').insert({
          event_type: 'purchase',
          event_name: 'order_completed',
          user_id: order.user_id,
          order_id: order.id,
          metadata: {
            order_number: orderNumber,
            total_amount: order.total_amount,
            items_count: orderItems.length
          }
        });
        console.log('Purchase analytics event tracked');
      } catch (analyticsError) {
        console.error('Error tracking purchase analytics:', analyticsError);
      }
    }

    // Clean up pending order
    await supabase
      .from('pending_orders')
      .delete()
      .eq('order_number', orderNumber);

    console.log('Order processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        status: 'created',
        orderNumber: orderNumber
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Order processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});