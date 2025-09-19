import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced logging function
const logOrderEvent = async (supabase: any, eventType: string, data: any, error?: string) => {
  try {
    await supabase.from('analytics_events').insert({
      event_type: 'order_processing',
      event_name: eventType,
      metadata: { ...data, error },
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    console.error('Failed to log order event:', logError);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { orderNumber, source = 'unknown', paymentData = null } = await req.json()

    if (!orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Order number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing order:', orderNumber, 'from source:', source);
    await logOrderEvent(supabase, 'order_processing_started', { orderNumber, source });

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, payment_status, user_id, email')
      .eq('order_number', orderNumber)
      .single()

    if (existingOrder) {
      console.log('Order already exists:', existingOrder)
      await logOrderEvent(supabase, 'order_already_exists', { orderNumber, orderId: existingOrder.id });
      
      // Update payment status if needed
      if (source === 'payfast_webhook' && paymentData) {
        const updates: any = { 
          payment_status: paymentData.payment_status === 'COMPLETE' ? 'paid' : 'pending',
          payment_gateway_response: paymentData,
          updated_at: new Date().toISOString()
        };
        
        // If order has no user_id but has email, try to create/link user account
        if (!existingOrder.user_id && existingOrder.email) {
          try {
            // Check if user with this email already exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', existingOrder.email)
              .single();
              
            if (existingProfile) {
              // Link order to existing user
              updates.user_id = existingProfile.id;
              await logOrderEvent(supabase, 'order_linked_to_existing_user', { 
                orderNumber, 
                userId: existingProfile.id,
                email: existingOrder.email 
              });
            } else {
              // Create new user account for this customer
              const { data: newUserId, error: createUserError } = await supabase
                .rpc('create_user_from_order', {
                  p_email: existingOrder.email,
                  p_first_name: null,
                  p_last_name: null,
                  p_order_id: existingOrder.id
                });
                
              if (!createUserError && newUserId) {
                updates.user_id = newUserId;
                await logOrderEvent(supabase, 'user_created_for_order', { 
                  orderNumber, 
                  userId: newUserId,
                  email: existingOrder.email 
                });
              }
            }
          } catch (userError) {
            console.error('Error handling user account for order:', userError);
            await logOrderEvent(supabase, 'user_account_error', { orderNumber, error: userError.message });
          }
        }
        
        await supabase
          .from('orders')
          .update(updates)
          .eq('id', existingOrder.id);
          
        await logOrderEvent(supabase, 'order_payment_updated', { orderNumber, paymentStatus: updates.payment_status });
      }
      
      return new Response(
        JSON.stringify({ success: true, orderId: existingOrder.id, message: 'Order already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get pending order data with extended search
    let { data: pendingOrder, error: pendingError } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (pendingError || !pendingOrder) {
      console.log('Pending order not found, checking for recent orders by email pattern...');
      await logOrderEvent(supabase, 'pending_order_not_found', { orderNumber, error: pendingError?.message });
      
      // If this is a PayFast webhook but no pending order, it might be a legitimate payment
      // that we need to handle manually - create a fallback order
      if (source === 'payfast_webhook' && paymentData) {
        console.log('Creating fallback order for PayFast payment without pending order');
        
        return new Response(
          JSON.stringify({ 
            error: 'Pending order not found for PayFast payment', 
            orderNumber,
            requiresManualProcessing: true,
            paymentData 
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Pending order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found pending order, creating order...');

    // Create order with enhanced user handling
    let finalUserId = pendingOrder.user_id;
    
    // If no user_id but has email, try to create or link to user account
    if (!finalUserId && pendingOrder.form_data.email) {
      try {
        // Check if user with this email already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', pendingOrder.form_data.email)
          .single();
          
        if (existingProfile) {
          finalUserId = existingProfile.id;
          await logOrderEvent(supabase, 'order_linked_to_existing_user', { 
            orderNumber, 
            userId: existingProfile.id,
            email: pendingOrder.form_data.email 
          });
        } else {
          // Create new user account for this customer
          const { data: newUserId, error: createUserError } = await supabase
            .rpc('create_user_from_order', {
              p_email: pendingOrder.form_data.email,
              p_first_name: pendingOrder.form_data.firstName,
              p_last_name: pendingOrder.form_data.lastName,
              p_order_id: null // Will link after order creation
            });
            
          if (!createUserError && newUserId) {
            finalUserId = newUserId;
            await logOrderEvent(supabase, 'user_created_for_order', { 
              orderNumber, 
              userId: newUserId,
              email: pendingOrder.form_data.email 
            });
          }
        }
      } catch (userError) {
        console.error('Error handling user account for order:', userError);
        await logOrderEvent(supabase, 'user_account_error', { orderNumber, error: userError.message });
      }
    }

    const orderData = {
      order_number: orderNumber,
      user_id: finalUserId,
      email: pendingOrder.form_data.email,
      status: 'pending',
      payment_status: source === 'payfast_webhook' && paymentData?.payment_status === 'COMPLETE' ? 'paid' : 'pending',
      payment_method: pendingOrder.payment_method || 'payfast',
      payment_gateway: 'payfast',
      payment_gateway_response: paymentData || null,
      subtotal: pendingOrder.subtotal,
      shipping_amount: pendingOrder.delivery_fee || 0,
      total_amount: pendingOrder.total_amount,
      currency: 'ZAR',
      billing_address: {
        first_name: pendingOrder.form_data.firstName,
        last_name: pendingOrder.form_data.lastName,
        email: pendingOrder.form_data.email,
        phone: pendingOrder.form_data.phone,
        address_line_1: pendingOrder.form_data.address,
        city: pendingOrder.form_data.city,
        postal_code: pendingOrder.form_data.postalCode,
        country: 'South Africa'
      },
      shipping_address: {
        first_name: pendingOrder.form_data.firstName,
        last_name: pendingOrder.form_data.lastName,
        phone: pendingOrder.form_data.phone,
        address_line_1: pendingOrder.form_data.address,
        city: pendingOrder.form_data.city,
        postal_code: pendingOrder.form_data.postalCode,
        country: 'South Africa'
      },
      notes: pendingOrder.form_data.notes || null
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      await logOrderEvent(supabase, 'order_creation_failed', { orderNumber, error: orderError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await logOrderEvent(supabase, 'order_created', { orderNumber, orderId: newOrder.id, userId: finalUserId });

    console.log('Order created:', newOrder.id)

    // Create order items
    const orderItems = pendingOrder.cart_data.items.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.product_id || item.product?.id,
      quantity: item.quantity,
      unit_price: item.product?.price || 0,
      total_price: (item.product?.price || 0) * item.quantity,
      product_name: item.product?.name || 'Product',
      product_sku: item.product?.sku || null
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
    } else {
      console.log('Order items created successfully')
    }

    // Track analytics event
    if (newOrder.status === 'confirmed' || newOrder.payment_status === 'paid') {
      await supabase.from('analytics_events').insert({
        event_type: 'purchase',
        event_name: 'order_completed',
        user_id: newOrder.user_id,
        order_id: newOrder.id,
        metadata: {
          order_number: orderNumber,
          total_amount: newOrder.total_amount
        }
      });
    }

    // Clean up pending order
    await supabase
      .from('pending_orders')
      .delete()
      .eq('order_number', orderNumber)

    return new Response(
      JSON.stringify({ success: true, orderId: newOrder.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Order processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})