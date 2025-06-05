
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { orderId, paymentReference, paymentMethod } = await req.json()

    if (!orderId) {
      throw new Error('Order ID is required')
    }

    // Get the order from database
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    let orderStatus = order.status

    // Handle payment verification based on payment method
    switch (paymentMethod) {
      case 'payfast':
        // Implement Payfast payment verification logic here
        // For now, just mark as confirmed
        orderStatus = 'confirmed'
        break

      case 'payflex':
        // Implement Payflex payment verification logic here
        // For now, just mark as confirmed
        orderStatus = 'confirmed'
        break

      case 'instant_eft':
        // Implement Instant EFT verification logic here
        // For now, just mark as confirmed
        orderStatus = 'confirmed'
        break

      case 'bank_transfer':
      case 'eft':
        // Manual verification required for bank transfers
        // Admin will need to manually confirm payment
        orderStatus = 'pending'
        break

      case 'cod':
        // Already confirmed during order creation
        orderStatus = 'confirmed'
        break

      default:
        throw new Error('Unsupported payment method')
    }

    // Update stock quantities for confirmed orders
    if (orderStatus === 'confirmed' && order.status !== 'confirmed') {
      for (const item of order.order_items) {
        if (item.product_id) {
          const { error: stockError } = await supabaseClient
            .rpc('update_product_stock', {
              p_product_id: item.product_id,
              p_quantity_change: -item.quantity,
              p_movement_type: 'sale',
              p_order_id: orderId,
              p_notes: `Sale from order ${order.order_number}`
            })

          if (stockError) {
            console.error('Stock update error:', stockError)
          }
        }
      }

      // Update order status
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Order update error:', updateError)
      }

      // Send order confirmation email
      try {
        await supabaseClient.functions.invoke('send-email', {
          body: {
            to: order.email,
            template: 'order-confirmation',
            data: {
              orderNumber: order.order_number,
              customerName: `${order.billing_address.firstName} ${order.billing_address.lastName}`,
              totalAmount: order.total_amount,
              items: order.order_items,
              orderDate: new Date(order.created_at).toLocaleDateString()
            }
          }
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }
    }

    return new Response(
      JSON.stringify({
        orderNumber: order.order_number,
        status: orderStatus,
        paymentMethod: paymentMethod,
        totalAmount: order.total_amount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
