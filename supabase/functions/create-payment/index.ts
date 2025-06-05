
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

    const { items, customerInfo, shippingAddress, paymentMethod } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided')
    }

    if (!customerInfo || !customerInfo.email) {
      throw new Error('Customer information is required')
    }

    if (!paymentMethod) {
      throw new Error('Payment method is required')
    }

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      const itemTotal = item.price * item.quantity
      subtotal += itemTotal
    }

    const taxAmount = subtotal * 0.15 // 15% VAT
    const shippingAmount = subtotal > 500 ? 0 : 50 // Free shipping over R500
    const totalAmount = subtotal + taxAmount + shippingAmount

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order in database
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
        payment_method: paymentMethod,
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

    // Handle different payment methods
    let paymentResponse = {}

    switch (paymentMethod) {
      case 'payfast':
        // For now, return order details - Payfast integration to be implemented
        paymentResponse = {
          type: 'payfast',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          message: 'Payfast integration to be implemented'
        }
        break

      case 'payflex':
        // For now, return order details - Payflex integration to be implemented
        paymentResponse = {
          type: 'payflex',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          message: 'Payflex integration to be implemented'
        }
        break

      case 'instant_eft':
        // For now, return order details - Instant EFT integration to be implemented
        paymentResponse = {
          type: 'instant_eft',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          message: 'Instant EFT integration to be implemented'
        }
        break

      case 'bank_transfer':
      case 'eft':
        // Return banking details for manual transfer
        paymentResponse = {
          type: 'bank_transfer',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          bankingDetails: {
            bankName: 'Your Bank Name',
            accountNumber: 'XXXX-XXXX-XXXX',
            branchCode: 'XXXXX',
            accountType: 'Current',
            reference: orderNumber
          },
          instructions: 'Please use the order number as your payment reference and email proof of payment to orders@yourstore.com'
        }
        break

      case 'cod':
        // Cash on delivery
        await supabaseClient
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', order.id)

        paymentResponse = {
          type: 'cod',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          message: 'Your order has been confirmed. Payment will be collected on delivery.'
        }
        break

      default:
        throw new Error('Unsupported payment method')
    }

    return new Response(
      JSON.stringify(paymentResponse),
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
