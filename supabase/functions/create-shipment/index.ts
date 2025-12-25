import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateShipmentRequest {
  order_id: string;
  service_level: string;
  parcels?: Array<{
    submitted_length_cm: number;
    submitted_width_cm: number;
    submitted_height_cm: number;
    submitted_weight_kg: number;
    description?: string;
  }>;
  special_instructions?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const shiplogicApiKey = Deno.env.get('SHIPLOGIC_API_KEY');

    if (!shiplogicApiKey) {
      console.error('[create-shipment] SHIPLOGIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Shipping service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateShipmentRequest = await req.json();
    console.log('[create-shipment] Request body:', JSON.stringify(body));

    if (!body.order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', body.order_id)
      .single();

    if (orderError || !order) {
      console.error('[create-shipment] Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shipping settings
    const { data: settings, error: settingsError } = await supabase
      .from('shipping_settings')
      .select('*')
      .eq('provider', 'shiplogic')
      .single();

    if (settingsError || !settings) {
      console.error('[create-shipment] Shipping settings not found:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Shipping settings not found' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.is_enabled) {
      return new Response(
        JSON.stringify({ error: 'Shipping service is disabled' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const collectionAddress = settings.collection_address;
    if (!collectionAddress || !collectionAddress.street_address) {
      return new Response(
        JSON.stringify({ error: 'Collection address not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build delivery address from order
    const shippingAddress = order.shipping_address || order.billing_address;
    const deliveryAddress = {
      type: 'residential',
      company: shippingAddress.company || '',
      street_address: shippingAddress.street || shippingAddress.address_line_1 || '',
      local_area: shippingAddress.suburb || shippingAddress.local_area || '',
      city: shippingAddress.city || '',
      zone: shippingAddress.province || shippingAddress.zone || '',
      country: shippingAddress.country || 'ZA',
      code: shippingAddress.postal_code || shippingAddress.code || '',
    };

    // Build parcels
    const parcels = Array.isArray(body.parcels) && body.parcels.length > 0 ? body.parcels : [{
      submitted_length_cm: settings.default_parcel?.length || 20,
      submitted_width_cm: settings.default_parcel?.width || 15,
      submitted_height_cm: settings.default_parcel?.height || 10,
      submitted_weight_kg: settings.default_parcel?.weight || 1,
      description: `Order ${order.order_number}`,
    }];

    // Build sender/receiver details
    const senderDetails = {
      name: collectionAddress.contact_name || 'Sender',
      phone: collectionAddress.phone || '',
      email: collectionAddress.email || '',
    };

    const receiverDetails = {
      name: shippingAddress.name || order.email,
      phone: shippingAddress.phone || '',
      email: order.email,
    };

    // Build ShipLogic shipment request
    const shiplogicRequest = {
      collection_address: {
        type: 'business',
        company: collectionAddress.company || '',
        street_address: collectionAddress.street_address,
        local_area: collectionAddress.local_area || '',
        city: collectionAddress.city,
        zone: collectionAddress.zone,
        country: collectionAddress.country || 'ZA',
        code: collectionAddress.code,
      },
      collection_contact: senderDetails,
      delivery_address: deliveryAddress,
      delivery_contact: receiverDetails,
      parcels: parcels,
      service_level_code: body.service_level,
      declared_value: order.total_amount || 0,
      collection_min_date: new Date().toISOString().split('T')[0],
      mute_notifications: false,
      special_instructions_collection: body.special_instructions || '',
      special_instructions_delivery: order.customer_notes || '',
    };

    console.log('[create-shipment] ShipLogic request:', JSON.stringify(shiplogicRequest));

    // Call ShipLogic API
    const response = await fetch('https://api.shiplogic.com/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${shiplogicApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shiplogicRequest),
    });

    const responseText = await response.text();
    console.log('[create-shipment] ShipLogic response status:', response.status);
    console.log('[create-shipment] ShipLogic response:', responseText);

    if (!response.ok) {
      console.error('[create-shipment] ShipLogic API error:', responseText);
      return new Response(
        JSON.stringify({ error: 'Failed to create shipment', details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shipment = JSON.parse(responseText);

    // Save shipment to database
    const { data: savedShipment, error: saveError } = await supabase
      .from('shipments')
      .insert({
        order_id: order.id,
        shiplogic_id: shipment.id || shipment.shipment_id,
        waybill_number: shipment.short_tracking_reference || shipment.waybill_number,
        tracking_number: shipment.tracking_reference || shipment.tracking_number,
        service_level: body.service_level,
        service_name: shipment.service_level?.name || body.service_level,
        rate_amount: shipment.rate || 0,
        status: 'created',
        label_url: shipment.label_url || null,
        collection_address: collectionAddress,
        delivery_address: deliveryAddress,
        parcels: parcels,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[create-shipment] Failed to save shipment:', saveError);
      // Continue anyway - shipment was created in ShipLogic
    }

    // Update order with tracking number
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: shipment.short_tracking_reference || shipment.tracking_reference,
        fulfillment_status: 'fulfilled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[create-shipment] Failed to update order:', updateError);
    }

    // Add timeline entry
    await supabase.from('order_timeline').insert({
      order_id: order.id,
      event_type: 'shipment_created',
      event_title: 'Shipment created',
      event_description: `Shipment created with ShipLogic. Tracking: ${shipment.short_tracking_reference || shipment.tracking_reference}`,
      metadata: { shipment_id: shipment.id, service_level: body.service_level },
    });

    console.log('[create-shipment] Shipment created successfully:', savedShipment?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shipment: savedShipment || {
          ...shipment,
          order_id: order.id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-shipment] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
