
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

const generateAdminNotificationHtml = (data: any) => {
  // Check if this is a trader application notification
  if (data.type === 'trader-application' && data.applicationDetails) {
    const app = data.applicationDetails;
    return `
<!DOCTYPE html>
<html>
<head>
  <title>New Trader Application</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #9333ea 0%, #DC3545 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px;">
      <h1 style="margin: 0; font-size: 24px;">🏢 New Trader Application</h1>
    </div>

    <div style="background-color: #f8f4ff; border-left: 4px solid #9333ea; padding: 15px; margin: 20px 0;">
      <strong>${app.companyName}</strong> has submitted a trader application and is awaiting review.
    </div>

    <h3 style="color: #9333ea; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px;">Company Information</h3>
    <table style="width: 100%; margin-bottom: 20px;">
      <tr><td style="color: #666; padding: 5px 0; width: 40%;">Company Name</td><td style="font-weight: 500;">${app.companyName}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Trading Name</td><td style="font-weight: 500;">${app.tradingName}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">VAT Number</td><td style="font-weight: 500;">${app.vatNumber}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Registration Number</td><td style="font-weight: 500;">${app.registrationNumber}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Business Type</td><td style="font-weight: 500;">${app.businessType}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Years in Business</td><td style="font-weight: 500;">${app.yearsInBusiness}</td></tr>
    </table>

    <h3 style="color: #9333ea; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px;">Contact Information</h3>
    <table style="width: 100%; margin-bottom: 20px;">
      <tr><td style="color: #666; padding: 5px 0; width: 40%;">Contact Person</td><td style="font-weight: 500;">${app.contactPerson}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Email</td><td style="font-weight: 500;"><a href="mailto:${app.email}">${app.email}</a></td></tr>
      <tr><td style="color: #666; padding: 5px 0;">Phone</td><td style="font-weight: 500;"><a href="tel:${app.phone}">${app.phone}</a></td></tr>
    </table>

    <h3 style="color: #9333ea; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px;">Business Address</h3>
    <p style="font-weight: 500; margin-bottom: 20px;">${app.address}</p>

    <h3 style="color: #9333ea; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px;">Additional Information</h3>
    <table style="width: 100%; margin-bottom: 20px;">
      <tr><td style="color: #666; padding: 5px 0; width: 40%;">Estimated Monthly Orders</td><td style="font-weight: 500;">${app.estimatedMonthlyOrders}</td></tr>
      <tr><td style="color: #666; padding: 5px 0;">User ID</td><td style="font-weight: 500;">${app.userId}</td></tr>
    </table>
    ${app.additionalInfo !== 'N/A' ? `<p style="background: #f5f5f5; padding: 15px; border-radius: 4px;"><strong>Notes:</strong> ${app.additionalInfo}</p>` : ''}

    ${data.actionUrl ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://ozzsa.com${data.actionUrl}" style="display: inline-block; background-color: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">${data.actionText || 'Review Application'}</a>
    </div>
    ` : ''}

    <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
      Submitted on ${app.submittedAt}
    </p>
  </div>
</body>
</html>
`;
  }

  // Default admin notification
  return `
<!DOCTYPE html>
<html>
<head><title>Admin Notification</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Admin Notification</h1>
  <p>${data.message}</p>
</body>
</html>
`;
};

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
