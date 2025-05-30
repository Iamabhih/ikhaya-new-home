
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customerInfo } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "zar",
        product_data: {
          name: item.name,
          description: item.description,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: customerInfo.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/cart`,
      shipping_address_collection: {
        allowed_countries: ['ZA'],
      },
      billing_address_collection: 'required',
    });

    // Create order in database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const orderNumber = `ORD-${Date.now()}`;
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    const { data: order, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        order_number: orderNumber,
        email: customerInfo.email,
        status: "pending",
        subtotal: subtotal,
        tax_amount: 0,
        shipping_amount: 0,
        total_amount: subtotal,
        currency: "ZAR",
        billing_address: customerInfo,
        notes: `Stripe session: ${session.id}`,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Add order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_sku: item.sku,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabaseService
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return new Response(
      JSON.stringify({ 
        url: session.url,
        orderId: order.id,
        orderNumber: orderNumber 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
