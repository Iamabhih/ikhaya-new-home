
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { OrderConfirmationEmail } from "./_templates/order-confirmation.tsx";
import { OrderStatusEmail } from "./_templates/order-status.tsx";
import { WelcomeEmail } from "./_templates/welcome.tsx";
import { AdminNotificationEmail } from "./_templates/admin-notification.tsx";

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
        html = await renderAsync(React.createElement(OrderConfirmationEmail, data));
        subject = `Order Confirmation #${data.orderNumber}`;
        break;
      case 'order-status':
        html = await renderAsync(React.createElement(OrderStatusEmail, data));
        subject = `Order Update #${data.orderNumber}`;
        break;
      case 'welcome':
        html = await renderAsync(React.createElement(WelcomeEmail, data));
        subject = "Welcome to Our Store!";
        break;
      case 'admin-notification':
        html = await renderAsync(React.createElement(AdminNotificationEmail, data));
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
