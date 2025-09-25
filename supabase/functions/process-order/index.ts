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

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Order number is required' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingOrder) {
      console.log('Order already exists:', existingOrder);
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
      return new Response(
        JSON.stringify({ error: 'Pending order not found' }), 
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('Found pending order:', pendingOrder.id);

    // Create the main order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: pendingOrder.user_id,
        status: 'confirmed',
        payment_status: 'paid',
        total_amount: pendingOrder.total_amount,
        shipping_address: {
          firstName: pendingOrder.form_data.firstName,
          lastName: pendingOrder.form_data.lastName,
          email: pendingOrder.form_data.email,
          phone: pendingOrder.form_data.phone,
          address: pendingOrder.form_data.address,
          city: pendingOrder.form_data.city,
          postalCode: pendingOrder.form_data.postalCode,
          province: pendingOrder.form_data.province,
        },
        delivery_info: {
          fee: pendingOrder.delivery_data.fee,
          method: pendingOrder.delivery_data.method
        },
        payment_method: 'payfast',
        payment_data: paymentData || {},
        notes: `Order processed via ${source}`
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Created order:', newOrder.id);

    // Create order items
    const orderItems = pendingOrder.cart_data.items.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
      product_snapshot: {
        name: item.product.name,
        description: item.product.description,
        images: item.product.images
      }
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Don't fail the entire process, just log the error
    } else {
      console.log('Created order items:', orderItems.length);
    }

    // Update product stock (if stock tracking is enabled)
    for (const item of pendingOrder.cart_data.items) {
      try {
        const { error: stockError } = await supabase.rpc(
          'update_product_stock',
          {
            product_id: item.product.id,
            quantity_sold: item.quantity
          }
        );

        if (stockError) {
          console.error('Error updating stock for product:', item.product.id, stockError);
        }
      } catch (stockError) {
        console.error('Stock update error:', stockError);
      }
    }

    // Send confirmation email (optional - implement if needed)
    try {
      const { error: emailError } = await supabase.functions.invoke('send-order-confirmation', {
        body: {
          orderNumber: orderNumber,
          customerEmail: pendingOrder.form_data.email,
          orderData: newOrder
        }
      });

      if (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the order process if email fails
      }
    } catch (emailError) {
      console.error('Email service error:', emailError);
    }

    // Clean up pending order
    const { error: deleteError } = await supabase
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrder.id);

    if (deleteError) {
      console.error('Error deleting pending order:', deleteError);
    }

    // Track purchase analytics
    try {
      const { error: analyticsError } = await supabase
        .from('analytics_events')
        .insert({
          user_id: pendingOrder.user_id,
          event_type: 'purchase',
          event_name: 'order_completed',
          order_id: newOrder.id,
          metadata: {
            total_amount: pendingOrder.total_amount,
            item_count: pendingOrder.cart_data.items.length,
            payment_method: 'payfast',
            source: source,
            products: pendingOrder.cart_data.items.map((item: any) => ({
              product_id: item.product.id,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        });

      if (analyticsError) {
        console.error('Error tracking purchase analytics:', analyticsError);
        // Don't fail the order process if analytics fails
      }
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    console.log('Order processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
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
