
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

    const { items, customerInfo, shippingAddress } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided')
    }

    if (!customerInfo || !customerInfo.email) {
      throw new Error('Customer information is required')
    }

    // Calculate totals
    let subtotal = 0
    const lineItems = []

    for (const item of items) {
      const itemTotal = item.price * item.quantity
      subtotal += itemTotal

      lineItems.push({
        price_data: {
          currency: 'zar',
          product_data: {
            name: item.name,
            description: item.description || '',
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })
    }

    const taxAmount = subtotal * 0.15 // 15% VAT
    const shippingAmount = subtotal > 500 ? 0 : 50 // Free shipping over R500
    const totalAmount = subtotal + taxAmount + shippingAmount

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order in database first
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        email: customerInfo.email,
        subtotal: subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        status: 'pending',
        payment_method: 'stripe',
        billing_address: {
          email: customerInfo.email,
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          phone: customerInfo.phone,
          address: customerInfo.address,
          city: customerInfo.city,
          province: customerInfo.province,
          postalCode: customerInfo.postalCode,
        },
        shipping_address: shippingAddress || {
          email: customerInfo.email,
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          phone: customerInfo.phone,
          address: customerInfo.address,
          city: customerInfo.city,
          province: customerInfo.province,
          postalCode: customerInfo.postalCode,
        }
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw new Error('Failed to create order')
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_sku: item.sku || null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }))

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      throw new Error('Failed to create order items')
    }

    // Add shipping as line item if applicable
    if (shippingAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'zar',
          product_data: {
            name: 'Shipping',
            description: 'Standard delivery',
          },
          unit_amount: Math.round(shippingAmount * 100),
        },
        quantity: 1,
      })
    }

    // Add tax as line item
    lineItems.push({
      price_data: {
        currency: 'zar',
        product_data: {
          name: 'VAT (15%)',
          description: 'Value Added Tax',
        },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerInfo.email,
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['ZA'],
      },
    })

    // Update order with Stripe session ID
    await supabaseClient
      .from('orders')
      .update({ 
        notes: `Stripe session: ${session.id}` 
      })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({ 
        url: session.url,
        orderId: order.id,
        orderNumber: orderNumber
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Payment creation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
