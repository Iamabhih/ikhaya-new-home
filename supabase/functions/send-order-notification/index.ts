import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  type: 'status_change' | 'shipment' | 'delivery' | 'fulfillment';
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, type, metadata = {} }: OrderNotificationRequest = await req.json();

    console.log(`Processing order notification for order ${orderId}, type: ${type}`);

    // Get order details with customer info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id(email, first_name, last_name),
        order_items(
          id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const customerEmail = order.profiles?.email;
    const customerName = order.profiles ? `${order.profiles.first_name || ''} ${order.profiles.last_name || ''}`.trim() : 'Valued Customer';

    if (!customerEmail) {
      console.error('No customer email found for order:', orderId);
      return new Response(JSON.stringify({ error: 'Customer email not found' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate email content based on notification type
    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'status_change':
        subject = `Order ${order.order_number} - Status Update`;
        htmlContent = generateStatusChangeEmail(order, customerName, metadata);
        break;
      
      case 'shipment':
        subject = `Order ${order.order_number} - Shipped!`;
        htmlContent = generateShipmentEmail(order, customerName, metadata);
        break;
      
      case 'delivery':
        subject = `Order ${order.order_number} - Delivered`;
        htmlContent = generateDeliveryEmail(order, customerName, metadata);
        break;
      
      case 'fulfillment':
        subject = `Order ${order.order_number} - Fulfillment Update`;
        htmlContent = generateFulfillmentEmail(order, customerName, metadata);
        break;
      
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Orders <orders@resend.dev>",
      to: [customerEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from('email_logs').insert({
      email_address: customerEmail,
      template_name: `order_${type}`,
      subject: subject,
      user_id: order.user_id,
      metadata: { order_id: orderId, ...metadata },
      status: 'sent'
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function generateStatusChangeEmail(order: any, customerName: string, metadata: any): string {
  const statusDisplayMap: Record<string, string> = {
    'pending': 'Pending',
    'awaiting_payment': 'Awaiting Payment',
    'processing': 'Processing',
    'partially_fulfilled': 'Partially Fulfilled',
    'fulfilled': 'Fulfilled',
    'shipped': 'Shipped',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'returned': 'Returned',
    'refunded': 'Refunded'
  };

  const statusDisplay = statusDisplayMap[order.status] || order.status;
  const statusColor = getStatusColor(order.status);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .status-badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            color: white; 
            font-weight: bold; 
            background-color: ${statusColor};
          }
          .order-items { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
            <p>Hello ${customerName},</p>
            <p>Your order <strong>#${order.order_number}</strong> status has been updated.</p>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <span class="status-badge">${statusDisplay}</span>
          </div>

          <div class="order-items">
            <h3>Order Summary</h3>
            ${order.order_items.map((item: any) => `
              <div class="item">
                <span>${item.product_name} (${item.quantity}x)</span>
                <span>R${item.total_price.toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="item" style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px;">
              <span>Total</span>
              <span>R${order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          ${order.status === 'shipped' && order.tracking_number ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>Tracking Information</h4>
              <p><strong>Tracking Number:</strong> ${order.tracking_number}</p>
              ${order.estimated_delivery_date ? `<p><strong>Expected Delivery:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString()}</p>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateShipmentEmail(order: any, customerName: string, metadata: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Shipped</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .tracking-info { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Your Order Has Shipped!</h1>
            <p>Order #${order.order_number}</p>
          </div>

          <p>Hello ${customerName},</p>
          <p>Great news! Your order has been shipped and is on its way to you.</p>

          ${order.tracking_number ? `
            <div class="tracking-info">
              <h3>Tracking Information</h3>
              <p><strong>Tracking Number:</strong> ${order.tracking_number}</p>
              ${order.tracking_company ? `<p><strong>Carrier:</strong> ${order.tracking_company}</p>` : ''}
              ${order.estimated_delivery_date ? `<p><strong>Expected Delivery:</strong> ${new Date(order.estimated_delivery_date).toLocaleDateString()}</p>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>You'll receive another email when your order is delivered.</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateDeliveryEmail(order: any, customerName: string, metadata: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196f3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Delivered!</h1>
            <p>Order #${order.order_number}</p>
          </div>

          <p>Hello ${customerName},</p>
          <p>Your order has been successfully delivered!</p>
          
          <p>We hope you love your purchase. If you have any issues or questions, please don't hesitate to contact us.</p>

          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Delivered on:</strong> ${order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : 'Today'}</p>
          </div>

          <div class="footer">
            <p>Thank you for choosing us!</p>
            <p>We'd love to hear about your experience - consider leaving a review.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateFulfillmentEmail(order: any, customerName: string, metadata: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fulfillment Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fulfillment Update</h1>
            <p>Order #${order.order_number}</p>
          </div>

          <p>Hello ${customerName},</p>
          <p>We have an update on your order fulfillment.</p>
          
          <p>Your order status: <strong>${order.fulfillment_status}</strong></p>

          <div class="footer">
            <p>We'll keep you updated on any further changes.</p>
            <p>Thank you for your patience!</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'pending': '#ff9800',
    'awaiting_payment': '#f44336',
    'processing': '#2196f3',
    'partially_fulfilled': '#ff9800',
    'fulfilled': '#4caf50',
    'shipped': '#4caf50',
    'out_for_delivery': '#4caf50',
    'delivered': '#4caf50',
    'completed': '#4caf50',
    'cancelled': '#9e9e9e',
    'returned': '#ff5722',
    'refunded': '#9e9e9e'
  };
  return colorMap[status] || '#9e9e9e';
}

serve(handler);