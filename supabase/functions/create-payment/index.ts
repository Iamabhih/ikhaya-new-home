import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PayFlex OAuth2 token helper
async function getPayflexAccessToken() {
  const tokenEndpoint = 'https://auth-uat.payflex.co.za/auth/merchant'
  const audience = 'https://auth-dev.payflex.co.za'
  
  const clientId = Deno.env.get('PAYFLEX_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYFLEX_CLIENT_SECRET')
  
  console.log('PayFlex Auth - Client ID exists:', !!clientId)
  console.log('PayFlex Auth - Client Secret exists:', !!clientSecret)
  
  if (!clientId || !clientSecret) {
    throw new Error('PayFlex credentials not configured. Please set PAYFLEX_CLIENT_ID and PAYFLEX_CLIENT_SECRET environment variables.')
  }
  
  const tokenRequest = {
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
    grant_type: 'client_credentials'
  }

  console.log('PayFlex Auth - Making token request to:', tokenEndpoint)

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequest)
    })

    console.log('PayFlex Auth - Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PayFlex Auth - Error response:', errorText)
      throw new Error(`Failed to get PayFlex token: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const tokenData = await response.json()
    console.log('PayFlex Auth - Token received successfully')
    return tokenData.access_token
  } catch (error) {
    console.error('PayFlex authentication error:', error)
    throw new Error(`Failed to authenticate with PayFlex: ${error.message}`)
  }
}

// Create PayFlex checkout
async function createPayflexCheckout(orderData: any, accessToken: string) {
  const checkoutEndpoint = 'https://api.uat.payflex.co.za/v1/checkouts'
  
  console.log('PayFlex Checkout - Creating checkout with data:', JSON.stringify(orderData, null, 2))
  
  try {
    const response = await fetch(checkoutEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderData)
    })

    console.log('PayFlex Checkout - Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PayFlex Checkout - Error response:', errorText)
      throw new Error(`Failed to create PayFlex checkout: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log('PayFlex Checkout - Success response:', JSON.stringify(result, null, 2))
    return result
  } catch (error) {
    console.error('PayFlex checkout creation error:', error)
    throw new Error(`Failed to create PayFlex checkout: ${error.message}`)
  }
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

    // Get base URL for redirects
    const baseUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

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
        // PayFast integration with environment configuration
        const payfastMerchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
        const payfastMerchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
        const payfastPassphrase = Deno.env.get('PAYFAST_PASSPHRASE')
        const payfastMode = Deno.env.get('PAYFAST_MODE') || 'sandbox'
        
        if (!payfastMerchantId || !payfastMerchantKey) {
          throw new Error('PayFast credentials not configured. Please set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables.')
        }
        
        // Use appropriate URLs based on mode
        const payfastUrl = payfastMode === 'production' 
          ? 'https://www.payfast.co.za/eng/process'
          : 'https://sandbox.payfast.co.za/eng/process'
        
        const payfastData = {
          merchant_id: payfastMerchantId,
          merchant_key: payfastMerchantKey,
          return_url: `${baseUrl}/payment/success?order_id=${order.id}&payment_method=payfast`,
          cancel_url: `${baseUrl}/checkout?cancelled=true`,
          notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
          // Order details
          name_first: customerInfo.firstName,
          name_last: customerInfo.lastName,
          email_address: customerInfo.email,
          cell_number: customerInfo.phone || '',
          m_payment_id: orderNumber,
          amount: totalAmount.toFixed(2),
          item_name: `Order ${orderNumber}`,
          item_description: `${items.length} items from IKHAYA Homeware`,
          custom_str1: payfastMode,
          custom_str2: order.id
        }
        
        // Add passphrase if provided (required for production)
        if (payfastPassphrase) {
          payfastData.passphrase = payfastPassphrase
        }
        
        paymentResponse = {
          type: 'payfast',
          orderId: order.id,
          orderNumber: orderNumber,
          amount: totalAmount,
          url: payfastUrl,
          formData: payfastData,
          message: 'Redirect to PayFast for payment processing'
        }
        break

      case 'payflex':
        console.log('PayFlex - Starting PayFlex payment flow')
        try {
          // Get PayFlex access token
          console.log('PayFlex - Getting access token...')
          const accessToken = await getPayflexAccessToken()
          
          // Prepare PayFlex checkout data
          const payflexCheckoutData = {
            amount: Math.round(totalAmount * 100), // Amount in cents
            currency: 'ZAR',
            description: `Order ${orderNumber} - IKHAYA Homeware`,
            merchant_reference: orderNumber,
            webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-payment`,
            success_url: `${baseUrl}/payment/success?order_id=${order.id}&payment_method=payflex`,
            failure_url: `${baseUrl}/checkout?failed=true`,
            customer: {
              first_name: customerInfo.firstName,
              last_name: customerInfo.lastName,
              email: customerInfo.email,
              mobile_number: customerInfo.phone || '',
              address: {
                line1: customerInfo.address,
                city: customerInfo.city,
                state: customerInfo.province,
                postal_code: customerInfo.postalCode,
                country: 'ZA'
              }
            },
            items: items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              amount: Math.round(item.price * 100), // Amount in cents
              category: 'physical_goods'
            }))
          }
          
          console.log('PayFlex - Creating checkout...')
          // Create PayFlex checkout
          const payflexCheckout = await createPayflexCheckout(payflexCheckoutData, accessToken)
          
          console.log('PayFlex - Checkout created successfully')
          paymentResponse = {
            type: 'payflex',
            orderId: order.id,
            orderNumber: orderNumber,
            amount: totalAmount,
            checkoutId: payflexCheckout.id,
            checkoutUrl: payflexCheckout.checkout_url,
            message: 'Redirect to PayFlex for payment processing'
          }
        } catch (error) {
          console.error('PayFlex integration error:', error)
          throw new Error(`PayFlex payment setup failed: ${error.message}`)
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