import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand colors and styles
const brandStyles = {
  primary: '#9333ea',
  secondary: '#DC3545',
  background: '#f8f9fa',
  text: '#333333',
  muted: '#666666',
  border: '#e5e5e5',
};

const emailWrapper = (content: string, previewText?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OZZ</title>
  ${previewText ? `<span style="display:none;font-size:1px;color:#ffffff;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</span>` : ''}
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
              ${content}
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

const generateOrderConfirmationHtml = (data: any) => {
  const items = data.items || [];
  const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${brandStyles.border};">
        <div style="display:flex;align-items:center;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;margin-right:15px;">` : ''}
          <div>
            <p style="margin:0;font-weight:500;color:${brandStyles.text};">${item.name}</p>
            ${item.variant ? `<p style="margin:4px 0 0;font-size:13px;color:${brandStyles.muted};">${item.variant}</p>` : ''}
          </div>
        </div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid ${brandStyles.border};text-align:center;color:${brandStyles.muted};">×${item.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid ${brandStyles.border};text-align:right;font-weight:500;">R${item.total?.toFixed(2)}</td>
    </tr>
  `).join('');

  return emailWrapper(`
    <h2 style="margin:0 0 20px;color:${brandStyles.text};font-size:24px;">Order Confirmed!</h2>
    <p style="margin:0 0 25px;color:${brandStyles.muted};font-size:16px;line-height:1.6;">
      Hi ${data.customerName},<br>
      Thank you for your order! We're preparing it for delivery.
    </p>
    
    <div style="background-color:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:25px;">
      <p style="margin:0;font-size:14px;color:${brandStyles.muted};">Order Number</p>
      <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:${brandStyles.primary};">#${data.orderNumber}</p>
    </div>

    <h3 style="margin:0 0 15px;font-size:16px;color:${brandStyles.text};">Order Summary</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsHtml}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:8px 0;color:${brandStyles.muted};">Subtotal</td>
        <td style="padding:8px 0;text-align:right;">R${data.subtotal?.toFixed(2)}</td>
      </tr>
      ${data.shipping ? `
      <tr>
        <td style="padding:8px 0;color:${brandStyles.muted};">Shipping</td>
        <td style="padding:8px 0;text-align:right;">R${data.shipping?.toFixed(2)}</td>
      </tr>
      ` : ''}
      ${data.discount ? `
      <tr>
        <td style="padding:8px 0;color:green;">Discount</td>
        <td style="padding:8px 0;text-align:right;color:green;">-R${data.discount?.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding:12px 0;font-weight:bold;font-size:18px;border-top:2px solid ${brandStyles.border};">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:bold;font-size:18px;border-top:2px solid ${brandStyles.border};">R${data.total?.toFixed(2)}</td>
      </tr>
    </table>

    ${data.shippingAddress ? `
    <div style="margin-top:30px;">
      <h3 style="margin:0 0 10px;font-size:16px;color:${brandStyles.text};">Delivery Address</h3>
      <p style="margin:0;color:${brandStyles.muted};line-height:1.6;">
        ${data.shippingAddress.name}<br>
        ${data.shippingAddress.street}<br>
        ${data.shippingAddress.city}, ${data.shippingAddress.postalCode}
      </p>
    </div>
    ` : ''}

    <div style="margin-top:30px;text-align:center;">
      <a href="https://ozzsa.com/orders/${data.orderNumber}" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:6px;font-weight:bold;">Track Your Order</a>
    </div>
  `, `Your order #${data.orderNumber} has been confirmed`);
};

const generateOrderStatusHtml = (data: any) => {
  const statusMessages: Record<string, { title: string; message: string; icon: string }> = {
    processing: {
      title: 'Order Being Processed',
      message: 'We\'re preparing your order for shipment.',
      icon: '📦'
    },
    shipped: {
      title: 'Order Shipped!',
      message: 'Your order is on its way to you.',
      icon: '🚚'
    },
    delivered: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. Enjoy!',
      icon: '✅'
    },
    cancelled: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have questions, please contact us.',
      icon: '❌'
    },
  };

  const status = statusMessages[data.status] || {
    title: 'Order Update',
    message: `Your order status has been updated to: ${data.status}`,
    icon: '📋'
  };

  return emailWrapper(`
    <div style="text-align:center;margin-bottom:30px;">
      <span style="font-size:48px;">${status.icon}</span>
      <h2 style="margin:20px 0 10px;color:${brandStyles.text};font-size:24px;">${status.title}</h2>
      <p style="margin:0;color:${brandStyles.muted};font-size:16px;">${status.message}</p>
    </div>
    
    <div style="background-color:#f8f9fa;border-radius:8px;padding:20px;text-align:center;margin-bottom:25px;">
      <p style="margin:0;font-size:14px;color:${brandStyles.muted};">Order Number</p>
      <p style="margin:5px 0 0;font-size:20px;font-weight:bold;color:${brandStyles.primary};">#${data.orderNumber}</p>
    </div>

    ${data.trackingNumber ? `
    <div style="background-color:#e8f5e9;border-radius:8px;padding:20px;margin-bottom:25px;">
      <p style="margin:0;font-size:14px;color:#2e7d32;">Tracking Number</p>
      <p style="margin:5px 0 0;font-size:18px;font-weight:bold;color:#1b5e20;">${data.trackingNumber}</p>
      ${data.trackingUrl ? `<a href="${data.trackingUrl}" style="display:inline-block;margin-top:10px;color:${brandStyles.primary};">Track Shipment →</a>` : ''}
    </div>
    ` : ''}

    <div style="text-align:center;">
      <a href="https://ozzsa.com/orders/${data.orderNumber}" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:6px;font-weight:bold;">View Order Details</a>
    </div>
  `, `Order #${data.orderNumber} - ${status.title}`);
};

const generateWelcomeHtml = (data: any) => emailWrapper(`
  <div style="text-align:center;">
    <span style="font-size:48px;">👋</span>
    <h2 style="margin:20px 0;color:${brandStyles.text};font-size:28px;">Welcome to OZZ!</h2>
    <p style="margin:0 0 25px;color:${brandStyles.muted};font-size:16px;line-height:1.6;">
      Hi ${data.firstName || 'there'},<br>
      Thanks for creating an account with us. You're now part of our community!
    </p>
  </div>
  
  <div style="background-color:#f8f9fa;border-radius:8px;padding:25px;margin:25px 0;">
    <h3 style="margin:0 0 15px;font-size:16px;color:${brandStyles.text};">What you can do:</h3>
    <ul style="margin:0;padding-left:20px;color:${brandStyles.muted};line-height:2;">
      <li>Browse our latest products</li>
      <li>Track your orders easily</li>
      <li>Save items to your wishlist</li>
      <li>Get exclusive member discounts</li>
    </ul>
  </div>

  <div style="text-align:center;">
    <a href="https://ozzsa.com/products" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:6px;font-weight:bold;">Start Shopping</a>
  </div>
`, 'Welcome to OZZ - Your account is ready!');

const generateAbandonedCartHtml = (data: any) => {
  const items = data.items || [];
  const itemsHtml = items.slice(0, 3).map((item: any) => `
    <div style="display:flex;align-items:center;padding:15px 0;border-bottom:1px solid ${brandStyles.border};">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-right:15px;">` : ''}
      <div>
        <p style="margin:0;font-weight:500;color:${brandStyles.text};">${item.name}</p>
        <p style="margin:5px 0 0;color:${brandStyles.primary};font-weight:bold;">R${item.price?.toFixed(2)}</p>
      </div>
    </div>
  `).join('');

  return emailWrapper(`
    <h2 style="margin:0 0 20px;color:${brandStyles.text};font-size:24px;">You left something behind!</h2>
    <p style="margin:0 0 25px;color:${brandStyles.muted};font-size:16px;line-height:1.6;">
      Hi there,<br>
      Looks like you left some items in your cart. Don't worry, we saved them for you!
    </p>

    <div style="margin-bottom:25px;">
      ${itemsHtml}
    </div>

    ${data.discountCode ? `
    <div style="background:linear-gradient(135deg,${brandStyles.primary} 0%,${brandStyles.secondary} 100%);border-radius:8px;padding:25px;text-align:center;margin-bottom:25px;">
      <p style="margin:0 0 10px;color:#ffffff;font-size:14px;">Special offer just for you!</p>
      <p style="margin:0;color:#ffffff;font-size:32px;font-weight:bold;">${data.discountPercentage}% OFF</p>
      <p style="margin:15px 0 0;color:#ffffff;font-size:14px;">Use code: <strong>${data.discountCode}</strong></p>
    </div>
    ` : ''}

    <div style="text-align:center;">
      <a href="https://ozzsa.com/cart" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:6px;font-weight:bold;font-size:16px;">Complete Your Purchase</a>
    </div>

    <p style="margin:25px 0 0;text-align:center;color:${brandStyles.muted};font-size:13px;">
      Items in your cart are not reserved and may sell out.
    </p>
  `, 'You left items in your cart - complete your purchase');
};

const generateAdminNotificationHtml = (data: any) => {
  if (data.type === 'trader-application' && data.applicationDetails) {
    const app = data.applicationDetails;
    return emailWrapper(`
      <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:15px;margin-bottom:25px;">
        <strong>🏢 New Trader Application</strong>
      </div>
      
      <p style="margin:0 0 20px;color:${brandStyles.muted};">
        <strong>${app.companyName}</strong> has submitted a trader application and is awaiting review.
      </p>

      <h3 style="margin:20px 0 10px;font-size:14px;color:${brandStyles.primary};text-transform:uppercase;border-bottom:1px solid ${brandStyles.border};padding-bottom:10px;">Company Information</h3>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="color:${brandStyles.muted};padding:5px 0;width:40%;">Company Name</td><td style="font-weight:500;">${app.companyName}</td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">Trading Name</td><td style="font-weight:500;">${app.tradingName}</td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">VAT Number</td><td style="font-weight:500;">${app.vatNumber}</td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">Registration Number</td><td style="font-weight:500;">${app.registrationNumber}</td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">Business Type</td><td style="font-weight:500;">${app.businessType}</td></tr>
      </table>

      <h3 style="margin:20px 0 10px;font-size:14px;color:${brandStyles.primary};text-transform:uppercase;border-bottom:1px solid ${brandStyles.border};padding-bottom:10px;">Contact Information</h3>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="color:${brandStyles.muted};padding:5px 0;width:40%;">Contact Person</td><td style="font-weight:500;">${app.contactPerson}</td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">Email</td><td style="font-weight:500;"><a href="mailto:${app.email}">${app.email}</a></td></tr>
        <tr><td style="color:${brandStyles.muted};padding:5px 0;">Phone</td><td style="font-weight:500;">${app.phone}</td></tr>
      </table>

      ${data.actionUrl ? `
      <div style="text-align:center;margin-top:30px;">
        <a href="https://ozzsa.com${data.actionUrl}" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:6px;font-weight:bold;">${data.actionText || 'Review Application'}</a>
      </div>
      ` : ''}
    `, 'New Trader Application - Review Required');
  }

  return emailWrapper(`
    <h2 style="margin:0 0 20px;color:${brandStyles.text};font-size:24px;">Admin Notification</h2>
    <p style="color:${brandStyles.muted};line-height:1.6;">${data.message}</p>
    
    ${data.actionUrl ? `
    <div style="margin-top:25px;">
      <a href="https://ozzsa.com${data.actionUrl}" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">${data.actionText || 'View Details'}</a>
    </div>
    ` : ''}
  `, data.subject || 'Admin Notification');
};

const generatePasswordResetHtml = (data: any) => emailWrapper(`
  <div style="text-align:center;">
    <span style="font-size:48px;">🔐</span>
    <h2 style="margin:20px 0;color:${brandStyles.text};font-size:24px;">Reset Your Password</h2>
    <p style="margin:0 0 25px;color:${brandStyles.muted};font-size:16px;line-height:1.6;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
  </div>

  <div style="text-align:center;margin:30px 0;">
    <a href="${data.resetUrl}" style="display:inline-block;background-color:${brandStyles.primary};color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:6px;font-weight:bold;font-size:16px;">Reset Password</a>
  </div>

  <p style="margin:25px 0 0;text-align:center;color:${brandStyles.muted};font-size:13px;">
    If you didn't request this, you can safely ignore this email.<br>
    This link will expire in 24 hours.
  </p>
`, 'Reset your OZZ password');

interface EmailRequest {
  type: 'order-confirmation' | 'order-status' | 'welcome' | 'admin-notification' | 'abandoned-cart' | 'password-reset';
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

    switch (type) {
      case 'order-confirmation':
        html = generateOrderConfirmationHtml(data);
        subject = `Order Confirmed #${data.orderNumber}`;
        break;
      case 'order-status':
        html = generateOrderStatusHtml(data);
        subject = `Order Update #${data.orderNumber}`;
        break;
      case 'welcome':
        html = generateWelcomeHtml(data);
        subject = "Welcome to OZZ!";
        break;
      case 'admin-notification':
        html = generateAdminNotificationHtml(data);
        subject = data.subject || "Admin Notification";
        break;
      case 'abandoned-cart':
        html = generateAbandonedCartHtml(data);
        subject = data.subject || "You left something behind!";
        break;
      case 'password-reset':
        html = generatePasswordResetHtml(data);
        subject = "Reset Your Password";
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "OZZ <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

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

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const body = await req.clone().json();
      
      await supabase.from('email_logs').insert({
        user_id: body.userId || null,
        email_address: body.to,
        template_name: body.type,
        subject: `Failed: ${body.type}`,
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