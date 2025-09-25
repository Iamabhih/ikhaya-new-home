import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface RecoveryCampaignRequest {
  campaignType: '1hr' | '24hr' | '72hr' | '1week' | 'manual';
  cartSessionIds?: string[];
  includeDiscount?: boolean;
  discountPercentage?: number;
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

    const { campaignType, cartSessionIds, includeDiscount, discountPercentage }: RecoveryCampaignRequest = await req.json();

    console.log(`Starting ${campaignType} recovery campaign...`);

    let targetCarts;

    if (cartSessionIds && cartSessionIds.length > 0) {
      // Manual campaign for specific carts
      const { data, error } = await supabaseClient
        .from('cart_sessions')
        .select(`
          *,
          enhanced_cart_tracking (
            product_name,
            product_price,
            quantity
          )
        `)
        .in('id', cartSessionIds)
        .not('email', 'is', null);

      if (error) throw error;
      targetCarts = data;
    } else {
      // Automatic campaign based on timing
      const timeFilter = getTimeFilter(campaignType);
      
      const { data, error } = await supabaseClient
        .from('cart_sessions')
        .select(`
          *,
          enhanced_cart_tracking (
            product_name,
            product_price,
            quantity
          )
        `)
        .is('abandoned_at', null)
        .not('email', 'is', null)
        .lt('updated_at', timeFilter)
        .gt('total_value', 0);

      if (error) throw error;
      targetCarts = data || [];
    }

    console.log(`Found ${targetCarts.length} carts for recovery campaign`);

    const campaignResults = [];

    for (const cart of targetCarts) {
      try {
        // Check if we've already sent this type of campaign to this cart
        const { data: existingCampaigns } = await supabaseClient
          .from('cart_abandonment_campaigns')
          .select('id')
          .eq('cart_session_id', cart.id)
          .eq('campaign_type', `email_${campaignType}`);

        if (existingCampaigns && existingCampaigns.length > 0) {
          console.log(`Skipping cart ${cart.id} - campaign already sent`);
          continue;
        }

        // Generate discount code if requested
        let discountCode = null;
        if (includeDiscount && discountPercentage) {
          discountCode = `SAVE${discountPercentage}-${cart.id.substring(0, 8).toUpperCase()}`;
        }

        // Create email content
        const emailContent = generateEmailContent(cart, campaignType, discountCode, discountPercentage);

        // Send email via Resend
        const emailResult = await resend.emails.send({
          from: 'OzzSA <noreply@ozz.co.za>',
          to: [cart.email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (emailResult.error) {
          throw emailResult.error;
        }

        // Log the campaign
        const { error: campaignError } = await supabaseClient
          .from('cart_abandonment_campaigns')
          .insert({
            cart_session_id: cart.id,
            campaign_type: `email_${campaignType}`,
            email_address: cart.email,
            discount_code: discountCode,
            discount_percentage: discountPercentage,
            subject_line: emailContent.subject,
            message_content: emailContent.html,
            metadata: {
              cart_value: cart.total_value,
              item_count: cart.item_count,
              email_id: emailResult.data?.id
            }
          });

        if (campaignError) {
          console.error('Error logging campaign:', campaignError);
        }

        campaignResults.push({
          cartId: cart.id,
          email: cart.email,
          status: 'sent',
          emailId: emailResult.data?.id,
          discountCode
        });

        console.log(`Recovery email sent to ${cart.email} for cart ${cart.id}`);

        // Mark cart as having recovery attempt
        await supabaseClient
          .from('cart_sessions')
          .update({ 
            abandoned_at: new Date().toISOString(),
            abandonment_stage: 'cart'
          })
          .eq('id', cart.id);

      } catch (emailError) {
        console.error(`Failed to send recovery email for cart ${cart.id}:`, emailError);
        
        // Log failed campaign
        await supabaseClient
          .from('cart_abandonment_campaigns')
          .insert({
            cart_session_id: cart.id,
            campaign_type: `email_${campaignType}`,
            email_address: cart.email,
            status: 'failed',
            metadata: { error: (emailError as Error).message }
          });

        campaignResults.push({
          cartId: cart.id,
          email: cart.email,
          status: 'failed',
          error: (emailError as Error).message
        });
      }
    }

    const response = {
      campaignType,
      totalCarts: targetCarts.length,
      emailsSent: campaignResults.filter(r => r.status === 'sent').length,
      emailsFailed: campaignResults.filter(r => r.status === 'failed').length,
      results: campaignResults
    };

    console.log('Recovery campaign completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in recovery campaign:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

function getTimeFilter(campaignType: string): string {
  const now = Date.now();
  switch (campaignType) {
    case '1hr':
      return new Date(now - 60 * 60 * 1000).toISOString();
    case '24hr':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case '72hr':
      return new Date(now - 72 * 60 * 60 * 1000).toISOString();
    case '1week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now - 60 * 60 * 1000).toISOString();
  }
}

function generateEmailContent(cart: any, campaignType: string, discountCode: string | null, discountPercentage?: number) {
  const cartItems = cart.enhanced_cart_tracking || [];
  const itemsList = cartItems
    .map((item: any) => `<li>${item.quantity}x ${item.product_name} - R${item.product_price}</li>`)
    .join('');

  const discountSection = discountCode ? `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h3 style="color: #007bff; margin: 0 0 10px 0;">Special Offer Just For You!</h3>
      <p style="margin: 0 0 10px 0;">Save ${discountPercentage}% on your order with code:</p>
      <div style="background: #007bff; color: white; padding: 10px; border-radius: 4px; font-weight: bold; font-size: 18px;">
        ${discountCode}
      </div>
    </div>
  ` : '';

  const urgencyMap = {
    '1hr': { subject: 'Did you forget something?', urgency: 'Your cart is waiting for you!' },
    '24hr': { subject: 'Still thinking it over?', urgency: 'Your items are still available' },
    '72hr': { subject: 'Last chance!', urgency: 'Your cart expires soon' },
    '1week': { subject: 'We miss you!', urgency: 'Come back and complete your purchase' }
  };

  const { subject, urgency } = urgencyMap[campaignType as keyof typeof urgencyMap] || urgencyMap['1hr'];

  return {
    subject: `${subject} - Cart Total: R${cart.total_value}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff;">OzzSA</h1>
          </div>
          
          <h2 style="color: #333;">${urgency}</h2>
          
          <p>Hi there!</p>
          
          <p>You left some great items in your cart. Don't let them get away!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Cart (${cart.item_count} items)</h3>
            <ul style="list-style: none; padding: 0;">
              ${itemsList}
            </ul>
            <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
              <strong>Total: R${cart.total_value}</strong>
            </div>
          </div>

          ${discountSection}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL')}/cart" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Complete Your Purchase
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            If you no longer wish to receive these emails, 
            <a href="${Deno.env.get('SITE_URL')}/unsubscribe?email=${cart.email}">click here to unsubscribe</a>.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">© 2024 OzzSA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

serve(handler);