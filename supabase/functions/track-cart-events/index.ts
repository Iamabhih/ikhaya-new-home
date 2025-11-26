import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartEvent {
  sessionId: string;
  userId?: string;
  email?: string;
  phone?: string;
  eventType: 'cart_created' | 'item_added' | 'item_removed' | 'checkout_initiated' | 'payment_attempted' | 'cart_abandoned' | 'cart_converted';
  productId?: string;
  productName?: string;
  productPrice?: number;
  quantity?: number;
  cartValue?: number;
  deviceInfo?: any;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  pageUrl?: string;
  abandonmentReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const cartEvent: CartEvent = await req.json();

    console.log('Processing cart event:', cartEvent.eventType, 'for session:', cartEvent.sessionId);

    // Get or create cart session
    let { data: cartSession, error: sessionError } = await supabaseClient
      .from('cart_sessions')
      .select('*')
      .eq('session_id', cartEvent.sessionId)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      throw sessionError;
    }

    // Create cart session if it doesn't exist
    if (!cartSession) {
      const { data: newSession, error: createError } = await supabaseClient
        .from('cart_sessions')
        .insert({
          session_id: cartEvent.sessionId,
          user_id: cartEvent.userId,
          email: cartEvent.email,
          phone: cartEvent.phone,
          device_info: cartEvent.deviceInfo || {},
          utm_source: cartEvent.utmSource,
          utm_medium: cartEvent.utmMedium,
          utm_campaign: cartEvent.utmCampaign,
          total_value: cartEvent.cartValue || 0,
          item_count: cartEvent.eventType === 'item_added' ? 1 : 0
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      cartSession = newSession;
      console.log('Created new cart session:', cartSession.id);
    }

    // Handle different event types
    switch (cartEvent.eventType) {
      case 'item_added':
        await handleItemAdded(supabaseClient, cartSession.id, cartEvent);
        break;
      
      case 'item_removed':
        await handleItemRemoved(supabaseClient, cartSession.id, cartEvent);
        break;
      
      case 'checkout_initiated':
        await handleCheckoutInitiated(supabaseClient, cartSession.id);
        break;
      
      case 'payment_attempted':
        await handlePaymentAttempted(supabaseClient, cartSession.id);
        break;
      
      case 'cart_abandoned':
        await handleCartAbandoned(supabaseClient, cartSession.id, cartEvent.abandonmentReason);
        break;
      
      case 'cart_converted':
        await handleCartConverted(supabaseClient, cartSession.id);
        break;
    }

    // Update session metadata
    await supabaseClient
      .from('cart_sessions')
      .update({
        updated_at: new Date().toISOString(),
        email: cartEvent.email || cartSession.email,
        phone: cartEvent.phone || cartSession.phone,
        page_views: cartSession.page_views + 1
      })
      .eq('id', cartSession.id);

    // Track analytics event
    await supabaseClient
      .from('analytics_events')
      .insert({
        user_id: cartEvent.userId,
        session_id: cartEvent.sessionId,
        event_type: 'cart_activity',
        event_name: cartEvent.eventType,
        product_id: cartEvent.productId,
        page_path: cartEvent.pageUrl,
        metadata: {
          cart_session_id: cartSession.id,
          product_name: cartEvent.productName,
          product_price: cartEvent.productPrice,
          quantity: cartEvent.quantity,
          cart_value: cartEvent.cartValue,
          abandonment_reason: cartEvent.abandonmentReason
        }
      });

    console.log('Cart event processed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      cartSessionId: cartSession.id,
      eventType: cartEvent.eventType 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing cart event:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

async function handleItemAdded(supabaseClient: any, cartSessionId: string, event: CartEvent) {
  // Add to enhanced cart tracking
  await supabaseClient
    .from('enhanced_cart_tracking')
    .insert({
      cart_session_id: cartSessionId,
      product_id: event.productId,
      product_name: event.productName,
      product_price: event.productPrice,
      quantity: event.quantity || 1,
      added_at: new Date().toISOString()
    });

  console.log('Item added to cart tracking');
}

async function handleItemRemoved(supabaseClient: any, cartSessionId: string, event: CartEvent) {
  // Mark item as removed in enhanced cart tracking
  await supabaseClient
    .from('enhanced_cart_tracking')
    .update({
      removed_at: new Date().toISOString(),
      time_in_cart: Math.floor((Date.now() - new Date().getTime()) / 1000)
    })
    .eq('cart_session_id', cartSessionId)
    .eq('product_id', event.productId)
    .is('removed_at', null);

  console.log('Item removed from cart');
}

async function handleCheckoutInitiated(supabaseClient: any, cartSessionId: string) {
  // Update cart session
  await supabaseClient
    .from('cart_sessions')
    .update({
      checkout_initiated_at: new Date().toISOString(),
      abandonment_stage: 'checkout'
    })
    .eq('id', cartSessionId);

  // Update all items in enhanced tracking
  await supabaseClient
    .from('enhanced_cart_tracking')
    .update({ checkout_reached: true })
    .eq('cart_session_id', cartSessionId)
    .is('removed_at', null);

  console.log('Checkout initiated for cart session');
}

async function handlePaymentAttempted(supabaseClient: any, cartSessionId: string) {
  await supabaseClient
    .from('cart_sessions')
    .update({
      payment_attempted_at: new Date().toISOString(),
      abandonment_stage: 'payment'
    })
    .eq('id', cartSessionId);

  await supabaseClient
    .from('enhanced_cart_tracking')
    .update({ payment_attempted: true })
    .eq('cart_session_id', cartSessionId)
    .is('removed_at', null);

  console.log('Payment attempted for cart session');
}

async function handleCartAbandoned(supabaseClient: any, cartSessionId: string, reason?: string) {
  const abandonedAt = new Date().toISOString();
  
  await supabaseClient
    .from('cart_sessions')
    .update({
      abandoned_at: abandonedAt,
      abandonment_stage: 'cart'
    })
    .eq('id', cartSessionId);

  await supabaseClient
    .from('enhanced_cart_tracking')
    .update({ 
      abandonment_reason: reason,
      time_in_cart: Math.floor((Date.now() - new Date().getTime()) / 1000)
    })
    .eq('cart_session_id', cartSessionId)
    .is('removed_at', null);

  console.log('Cart abandoned:', reason);
}

async function handleCartConverted(supabaseClient: any, cartSessionId: string) {
  const convertedAt = new Date().toISOString();
  
  await supabaseClient
    .from('cart_sessions')
    .update({
      converted_at: convertedAt,
      abandonment_stage: 'completed'
    })
    .eq('id', cartSessionId);

  await supabaseClient
    .from('enhanced_cart_tracking')
    .update({ purchased: true })
    .eq('cart_session_id', cartSessionId)
    .is('removed_at', null);

  console.log('Cart converted successfully');
}

serve(handler);