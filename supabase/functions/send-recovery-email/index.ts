import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const brandStyles = {
  primary: '#9333ea',
  secondary: '#DC3545',
  background: '#f8f9fa',
  text: '#333333',
  muted: '#666666',
  border: '#e5e5e5',
};

const generateRecoveryEmailHtml = (body: string, discountCode?: string, discountPercentage?: number) => {
  // Convert line breaks to HTML paragraphs
  const formattedBody = body
    .split('\n\n')
    .map(paragraph => `<p style="margin:0 0 16px;color:${brandStyles.text};line-height:1.6;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OZZ</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:${brandStyles.background};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${brandStyles.background};padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${brandStyles.primary} 0%,${brandStyles.secondary} 100%);padding:30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">OZZ</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 30px;">
              ${formattedBody}
              
              ${discountCode ? `
              <div style="background:linear-gradient(135deg,${brandStyles.primary} 0%,${brandStyles.secondary} 100%);border-radius:8px;padding:25px;text-align:center;margin:25px 0;">
                <p style="margin:0 0 10px;color:#ffffff;font-size:14px;">Special offer just for you!</p>
                <p style="margin:0;color:#ffffff;font-size:32px;font-weight:bold;">${discountPercentage || 10}% OFF</p>
                <p style="margin:15px 0 0;color:#ffffff;font-size:14px;">Use code: <strong>${discountCode}</strong></p>
              </div>
              ` : ''}

              <div style="text-align:center;margin-top:30px;">
                <a href="https://ozzsa.com/cart" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:6px;font-weight:bold;font-size:16px;">Complete Your Purchase</a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid ${brandStyles.border};">
              <p style="margin:0 0 10px;color:${brandStyles.muted};font-size:14px;">
                Thank you for shopping with OZZ
              </p>
              <p style="margin:0;color:${brandStyles.muted};font-size:12px;">
                © ${new Date().getFullYear()} OZZ. All rights reserved.
              </p>
              <div style="margin-top:15px;">
                <a href="https://ozzsa.com" style="color:${brandStyles.primary};text-decoration:none;font-size:12px;">Visit our website</a>
                <span style="color:${brandStyles.border};margin:0 10px;">|</span>
                <a href="https://ozzsa.com/contact" style="color:${brandStyles.primary};text-decoration:none;font-size:12px;">Contact us</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

interface RecoveryEmailRequest {
  to: string;
  subject: string;
  body: string;
  cartSessionId: string;
  discountCode?: string;
  discountPercentage?: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { to, subject, body, cartSessionId, discountCode, discountPercentage }: RecoveryEmailRequest = await req.json();

    console.log(`Sending recovery email to: ${to} for cart session: ${cartSessionId}`);

    // Generate HTML email
    const html = generateRecoveryEmailHtml(body, discountCode, discountPercentage);

    // Send the email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "OZZ <noreply@ozzsa.com>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      throw new Error(emailError.message);
    }

    console.log("Email sent successfully:", emailResult);

    // Log the campaign
    const { error: campaignError } = await supabase
      .from('cart_abandonment_campaigns')
      .insert({
        cart_session_id: cartSessionId,
        campaign_type: 'manual',
        email_address: to,
        subject_line: subject,
        message_content: body,
        discount_code: discountCode || null,
        discount_percentage: discountPercentage || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    if (campaignError) {
      console.error("Failed to log campaign:", campaignError);
      // Don't throw - email was sent successfully
    }

    // Log to email_logs table
    await supabase
      .from('email_logs')
      .insert({
        email_address: to,
        template_name: 'recovery-email',
        subject: subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          cartSessionId,
          discountCode,
          discountPercentage,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Recovery email sent successfully",
        emailId: emailResult?.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in send-recovery-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
