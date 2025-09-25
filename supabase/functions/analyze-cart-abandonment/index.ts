import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartAnalyticsData {
  abandonedCarts: any[];
  customerSegments: any[];
  topAbandonedProducts: any[];
  recoveryOpportunities: any[];
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

    console.log('Starting cart abandonment analysis...');

    // Analyze abandoned carts from the last 24 hours
    const { data: abandonedCarts, error: abandonedError } = await supabaseClient
      .from('cart_sessions')
      .select(`
        *,
        enhanced_cart_tracking (
          product_id,
          product_name,
          product_price,
          quantity,
          added_at
        )
      `)
      .is('abandoned_at', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gt('item_count', 0);

    if (abandonedError) {
      throw abandonedError;
    }

    // Identify high-value abandoned carts (>$100)
    const highValueCarts = abandonedCarts?.filter(cart => cart.total_value > 100) || [];

    // Get customer engagement metrics for segmentation
    const { data: customerMetrics, error: metricsError } = await supabaseClient
      .from('customer_engagement_metrics')
      .select('*')
      .order('lifetime_value', { ascending: false });

    if (metricsError) {
      throw metricsError;
    }

    // Analyze top abandoned products - using manual aggregation since Supabase doesn't support GROUP BY
    let topAbandoned = [];
    
    try {
      // Get raw data for manual aggregation
      const { data: rawData, error: rawError } = await supabaseClient
        .from('enhanced_cart_tracking')
        .select('product_id, product_name, product_price, quantity')
        .is('purchased', false)
        .gte('added_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (rawError) {
        console.error('Error fetching raw abandoned products:', rawError);
        topAbandoned = [];
      } else {
        // Manual aggregation
        const aggregated = new Map();
        rawData?.forEach(item => {
          const key = `${item.product_id}-${item.product_name}-${item.product_price}`;
          if (!aggregated.has(key)) {
            aggregated.set(key, {
              product_id: item.product_id,
              product_name: item.product_name,
              product_price: item.product_price,
              abandonment_count: 0,
              total_quantity_abandoned: 0,
              total_value_lost: 0
            });
          }
          const current = aggregated.get(key);
          current.abandonment_count++;
          current.total_quantity_abandoned += item.quantity;
          current.total_value_lost += item.product_price * item.quantity;
        });
        
        topAbandoned = Array.from(aggregated.values())
          .sort((a, b) => b.total_value_lost - a.total_value_lost)
          .slice(0, 10);
      }
    } catch (error) {
      console.error('Error processing abandoned products:', error);
      topAbandoned = [];
    }

    // Generate recovery opportunities
    const recoveryOpportunities = [];

    // 1-hour recovery opportunities (immediate action)
    const oneHourAbandoned = abandonedCarts?.filter(cart => {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      return new Date(cart.updated_at).getTime() < hourAgo && cart.email;
    }) || [];

    // 24-hour recovery opportunities
    const dayAbandoned = abandonedCarts?.filter(cart => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return new Date(cart.updated_at).getTime() < dayAgo && cart.email;
    }) || [];

    recoveryOpportunities.push({
      type: '1hr_email',
      count: oneHourAbandoned.length,
      totalValue: oneHourAbandoned.reduce((sum, cart) => sum + cart.total_value, 0),
      carts: oneHourAbandoned
    });

    recoveryOpportunities.push({
      type: '24hr_email',
      count: dayAbandoned.length,
      totalValue: dayAbandoned.reduce((sum, cart) => sum + cart.total_value, 0),
      carts: dayAbandoned
    });

    // Customer segmentation analysis
    const segments = {
      new: customerMetrics?.filter(c => c.total_orders === 0) || [],
      returning: customerMetrics?.filter(c => c.total_orders > 0 && c.total_orders < 5) || [],
      vip: customerMetrics?.filter(c => c.lifetime_value > 500) || [],
      at_risk: customerMetrics?.filter(c => c.days_since_last_order > 30) || [],
      churned: customerMetrics?.filter(c => c.days_since_last_order > 90) || []
    };

    // Update customer segments
    for (const [segment, customers] of Object.entries(segments)) {
      for (const customer of customers) {
        await supabaseClient
          .from('customer_engagement_metrics')
          .update({ customer_segment: segment })
          .eq('id', customer.id);
      }
    }

    // Create daily snapshot
    const today = new Date().toISOString().split('T')[0];
    const totalCarts = abandonedCarts?.length || 0;
    const convertedCarts = await getConvertedCartsCount(supabaseClient);
    
    const snapshotData = {
      snapshot_date: today,
      total_carts_created: totalCarts + convertedCarts,
      total_carts_abandoned: totalCarts,
      total_carts_converted: convertedCarts,
      abandonment_rate: totalCarts / (totalCarts + convertedCarts) * 100,
      conversion_rate: convertedCarts / (totalCarts + convertedCarts) * 100,
      avg_cart_value: abandonedCarts?.reduce((sum, cart) => sum + cart.total_value, 0) / totalCarts || 0,
      top_abandoned_products: topAbandoned || [],
      customer_segments: {
        new: segments.new.length,
        returning: segments.returning.length,
        vip: segments.vip.length,
        at_risk: segments.at_risk.length,
        churned: segments.churned.length
      }
    };

    await supabaseClient
      .from('cart_analytics_snapshots')
      .upsert(snapshotData, { onConflict: 'snapshot_date' });

    const analyticsData: CartAnalyticsData = {
      abandonedCarts: abandonedCarts || [],
      customerSegments: Object.entries(segments).map(([name, customers]) => ({
        name,
        count: customers.length,
        totalValue: customers.reduce((sum, c) => sum + c.lifetime_value, 0)
      })),
      topAbandonedProducts: topAbandoned || [],
      recoveryOpportunities
    };

    console.log('Cart abandonment analysis completed:', {
      abandonedCarts: totalCarts,
      highValueCarts: highValueCarts.length,
      recoveryOpportunities: recoveryOpportunities.length
    });

    return new Response(JSON.stringify(analyticsData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in cart abandonment analysis:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

async function getConvertedCartsCount(supabaseClient: any): Promise<number> {
  const { data, error } = await supabaseClient
    .from('cart_sessions')
    .select('id', { count: 'exact' })
    .not('converted_at', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (error) {
    console.error('Error getting converted carts count:', error);
    return 0;
  }
  
  return data?.length || 0;
}

serve(handler);