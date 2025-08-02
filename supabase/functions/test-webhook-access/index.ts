import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Testing PayFast webhook accessibility...')
    
    // Test GET request to webhook endpoint
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-webhook`
    console.log('Testing webhook URL:', webhookUrl)
    
    const testResponse = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PayFast-Test-Accessibility'
      }
    })
    
    console.log('Webhook accessibility test result:', {
      status: testResponse.status,
      statusText: testResponse.statusText,
      headers: Object.fromEntries(testResponse.headers.entries())
    })
    
    const responseText = await testResponse.text()
    console.log('Webhook response text:', responseText)
    
    return new Response(JSON.stringify({
      success: true,
      webhookUrl,
      testStatus: testResponse.status,
      testStatusText: testResponse.statusText,
      accessible: testResponse.status !== 404
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error) {
    console.error('Webhook accessibility test failed:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})