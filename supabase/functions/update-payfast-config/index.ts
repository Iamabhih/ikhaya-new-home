import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the current user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const hasAdminRole = userRoles?.some(role => role.role === 'admin' || role.role === 'superadmin')
    
    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { merchant_id, merchant_key, passphrase, mode, is_active } = await req.json()

    // Validate required fields
    if (!merchant_id || !merchant_key) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID and Merchant Key are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the configuration update
    console.log('Updating PayFast configuration:', {
      merchant_id: merchant_id ? 'Set' : 'Not set',
      merchant_key: merchant_key ? 'Set' : 'Not set',
      passphrase: passphrase ? 'Set' : 'Not set',
      mode,
      is_active
    })

    // Note: These should be updated as Supabase secrets in production
    // For now, we'll return success but mention that secrets need manual update
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PayFast configuration received. Please update the corresponding Supabase secrets: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_MODE, and PAYFAST_ACTIVE.',
        config: {
          merchant_id: merchant_id ? 'Set' : 'Not set',
          merchant_key: merchant_key ? 'Set' : 'Not set',
          passphrase: passphrase ? 'Set' : 'Not set',
          mode,
          is_active
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating PayFast config:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})