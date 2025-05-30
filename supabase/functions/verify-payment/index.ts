
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

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

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session.metadata?.order_id) {
      throw new Error('Order ID not found in session metadata')
    }

    const orderId = session.metadata.order_id

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

    // Update order status based on payment status
    if (session.payment_status === 'paid') {
      orderStatus = 'confirmed'
      
      // Update stock quantities for each item
      for (const item of order.order_items) {
        if (item.product_id) {
          const { error: stockError } = await supabaseClient
            .rpc('update_product_stock', {
              p_product_id: item.product_id,
              p_quantity_change: -item.quantity, // Negative for sale
              p_movement_type: 'sale',
              p_order_id: orderId,
              p_notes: `Sale from order ${order.order_number}`
            })

          if (stockError) {
            console.error('Stock update error:', stockError)
            // Don't fail the entire process for stock errors
          }
        }
      }

      // Update order status to confirmed
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
        // Don't fail for email errors
      }

      // Send admin notification
      try {
        await supabaseClient.functions.invoke('send-email', {
          body: {
            to: 'admin@yourstore.com', // Replace with actual admin email
            template: 'admin-notification',
            data: {
              orderNumber: order.order_number,
              customerEmail: order.email,
              totalAmount: order.total_amount,
              itemCount: order.order_items.length
            }
          }
        })
      } catch (adminEmailError) {
        console.error('Admin email error:', adminEmailError)
      }
    }

    return new Response(
      JSON.stringify({
        orderNumber: order.order_number,
        status: orderStatus,
        paymentStatus: session.payment_status,
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
