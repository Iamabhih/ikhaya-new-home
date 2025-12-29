import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, api_key } = body;

    if (action === 'check') {
      // Check if API key is configured
      const { data: settings, error } = await supabase
        .from('shipping_settings')
        .select('api_key_encrypted')
        .eq('provider', 'shiplogic')
        .single();

      if (error || !settings) {
        return new Response(
          JSON.stringify({ configured: false, masked_key: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = settings.api_key_encrypted;
      let maskedKey = null;
      
      if (apiKey && apiKey.length > 8) {
        // Mask all but first 4 and last 4 characters
        const first = apiKey.substring(0, 4);
        const last = apiKey.substring(apiKey.length - 4);
        maskedKey = `${first}${'•'.repeat(Math.min(apiKey.length - 8, 20))}${last}`;
      } else if (apiKey) {
        maskedKey = '••••••••';
      }

      return new Response(
        JSON.stringify({ 
          configured: !!apiKey, 
          masked_key: maskedKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      if (!api_key || api_key.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'API key is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update API key in database
      const { error: updateError } = await supabase
        .from('shipping_settings')
        .update({ 
          api_key_encrypted: api_key.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider', 'shiplogic');

      if (updateError) {
        console.error('[manage-api-key] Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return masked version
      const first = api_key.substring(0, 4);
      const last = api_key.substring(api_key.length - 4);
      const maskedKey = `${first}${'•'.repeat(Math.min(api_key.length - 8, 20))}${last}`;

      console.log('[manage-api-key] API key updated successfully by user:', user.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'API key updated successfully',
          masked_key: maskedKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'test') {
      // Get API key from database
      const { data: settings, error } = await supabase
        .from('shipping_settings')
        .select('api_key_encrypted, collection_address')
        .eq('provider', 'shiplogic')
        .single();

      const apiKey = settings?.api_key_encrypted || Deno.env.get('SHIPLOGIC_API_KEY');
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'No API key configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Test the API key with a simple rates request
      try {
        const testRequest = {
          collection_address: settings?.collection_address || {
            street_address: "Test Street",
            city: "Johannesburg",
            zone: "Gauteng",
            country: "ZA",
            code: "2000"
          },
          delivery_address: {
            street_address: "Test Street",
            city: "Cape Town",
            zone: "Western Cape",
            country: "ZA",
            code: "8000"
          },
          parcels: [{
            submitted_length_cm: 20,
            submitted_width_cm: 15,
            submitted_height_cm: 10,
            submitted_weight_kg: 1
          }]
        };

        const response = await fetch('https://api.shiplogic.com/rates', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testRequest),
        });

        if (response.ok) {
          return new Response(
            JSON.stringify({ success: true, message: 'API key is valid' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ success: false, error: `API error: ${response.status}`, details: errorText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (testError) {
        return new Response(
          JSON.stringify({ success: false, error: (testError as Error).message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[manage-api-key] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
