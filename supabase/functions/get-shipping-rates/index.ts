import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingRateRequest {
  collection_address?: {
    street_address: string;
    city: string;
    zone: string;
    country: string;
    code: string;
  };
  delivery_address: {
    street_address: string;
    city: string;
    zone: string;
    country: string;
    code: string;
  };
  parcels: Array<{
    submitted_length_cm: number;
    submitted_width_cm: number;
    submitted_height_cm: number;
    submitted_weight_kg: number;
  }>;
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
      console.error('[get-shipping-rates] SHIPLOGIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Shipping service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get shipping settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('shipping_settings')
      .select('*')
      .eq('provider', 'shiplogic')
      .single();

    if (settingsError || !settings) {
      console.error('[get-shipping-rates] Failed to get shipping settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Shipping settings not found' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.is_enabled) {
      console.log('[get-shipping-rates] ShipLogic integration is disabled');
      return new Response(
        JSON.stringify({ error: 'Shipping service is disabled', rates: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ShippingRateRequest = await req.json();
    console.log('[get-shipping-rates] Request body:', JSON.stringify(body));

    // Use collection address from settings if not provided
    const collectionAddress = body.collection_address || settings.collection_address;
    
    if (!collectionAddress || !collectionAddress.street_address) {
      console.error('[get-shipping-rates] Collection address not configured');
      return new Response(
        JSON.stringify({ error: 'Collection address not configured in shipping settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use default parcel if not provided
    const parcels = body.parcels?.length > 0 ? body.parcels : [{
      submitted_length_cm: settings.default_parcel?.length || 20,
      submitted_width_cm: settings.default_parcel?.width || 15,
      submitted_height_cm: settings.default_parcel?.height || 10,
      submitted_weight_kg: settings.default_parcel?.weight || 1,
    }];

    // Build ShipLogic API request
    const shiplogicRequest = {
      collection_address: collectionAddress,
      delivery_address: body.delivery_address,
      parcels: parcels,
      declared_value: 0,
      collection_min_date: new Date().toISOString().split('T')[0],
    };

    console.log('[get-shipping-rates] ShipLogic request:', JSON.stringify(shiplogicRequest));

    // Call ShipLogic API
    const apiUrl = settings.is_test_mode 
      ? 'https://api.shiplogic.com/rates' 
      : 'https://api.shiplogic.com/rates';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${shiplogicApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shiplogicRequest),
    });

    const responseText = await response.text();
    console.log('[get-shipping-rates] ShipLogic response status:', response.status);
    console.log('[get-shipping-rates] ShipLogic response:', responseText);

    if (!response.ok) {
      console.error('[get-shipping-rates] ShipLogic API error:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get shipping rates', 
          details: responseText,
          rates: [] 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rates = JSON.parse(responseText);
    
    // Apply markup if configured
    const markupPercentage = settings.markup_percentage || 0;
    const serviceLevels = settings.service_levels || {};

    const processedRates = (rates.rates || rates || [])
      .filter((rate: any) => {
        // Filter by enabled service levels
        const serviceType = rate.service_level?.toLowerCase() || '';
        if (serviceType.includes('economy') && !serviceLevels.economy) return false;
        if (serviceType.includes('express') && !serviceLevels.express) return false;
        if (serviceType.includes('overnight') && !serviceLevels.overnight) return false;
        return true;
      })
      .map((rate: any) => {
        const basePrice = rate.rate || rate.base_rate || 0;
        const markedUpPrice = basePrice * (1 + markupPercentage / 100);
        return {
          ...rate,
          original_rate: basePrice,
          rate: Math.round(markedUpPrice * 100) / 100,
          markup_applied: markupPercentage > 0,
        };
      });

    console.log('[get-shipping-rates] Processed rates:', JSON.stringify(processedRates));

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates: processedRates,
        collection_address: collectionAddress,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-shipping-rates] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, rates: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
