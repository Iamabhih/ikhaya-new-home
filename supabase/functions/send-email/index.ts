
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Simple HTML email templates without React Email
const generateOrderConfirmationHtml = (data: any) => `
<!DOCTYPE html>
<html>
<head><title>Order Confirmation</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Order Confirmation</h1>
  <p>Dear ${data.customerName},</p>
  <p>Your order #${data.orderNumber} has been confirmed.</p>
  <p>Thank you for your purchase!</p>
</body>
</html>
`;

const generateWelcomeHtml = (data: any) => `
<!DOCTYPE html>
<html>
<head><title>Welcome</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Welcome!</h1>
  <p>Hello ${data.firstName},</p>
  <p>Welcome to our platform!</p>
</body>
</html>
`;

const generateOrderStatusHtml = (data: any) => `
<!DOCTYPE html>
<html>
<head><title>Order Status Update</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Order Status Update</h1>
  <p>Dear ${data.customerName},</p>
  <p>Your order #${data.orderNumber} status: ${data.status}</p>
</body>
</html>
`;

const generateAdminNotificationHtml = (data: any) => `
<!DOCTYPE html>
<html>
<head><title>Admin Notification</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Admin Notification</h1>
  <p>${data.message}</p>
</body>
</html>
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'order-confirmation' | 'order-status' | 'welcome' | 'admin-notification';
  to: string;
  data: any;
  userId?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, to, data, userId }: EmailRequest = await req.json();

    console.log(`Sending email of type: ${type} to: ${to}`);

    let html = "";
    let subject = "";

    // Generate email content based on type
    switch (type) {
      case 'order-confirmation':
        html = generateOrderConfirmationHtml(data);
        subject = `Order Confirmation #${data.orderNumber}`;
        break;
      case 'order-status':
        html = generateOrderStatusHtml(data);
        subject = `Order Update #${data.orderNumber}`;
        break;
      case 'welcome':
        html = generateWelcomeHtml(data);
        subject = "Welcome to Our Store!";
        break;
      case 'admin-notification':
        html = generateAdminNotificationHtml(data);
        subject = data.subject || "Admin Notification";
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Store <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email to database
    await supabase.from('email_logs').insert({
      user_id: userId || null,
      email_address: to,
      template_name: type,
      subject,
      status: 'sent',
      external_id: emailResponse.data?.id,
      metadata: { data, type },
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending email:", error);

    // Log failed email attempt
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { to, type, userId } = await req.json();
      
      await supabase.from('email_logs').insert({
        user_id: userId || null,
        email_address: to,
        template_name: type,
        subject: `Failed: ${type}`,
        status: 'failed',
        error_message: error.message,
        metadata: { error: error.message },
      });
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
