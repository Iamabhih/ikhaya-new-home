import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

interface PaymentVerificationRequest {
  orderId: string;
  paymentMethod: string;
  paymentReference?: string;
  amount?: number;
  signature?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body: PaymentVerificationRequest = await req.json();
    
    // Input validation and sanitization
    if (!body.orderId || typeof body.orderId !== 'string') {
      throw new Error('Invalid or missing order ID');
    }
    
    if (!body.paymentMethod || typeof body.paymentMethod !== 'string') {
      throw new Error('Invalid or missing payment method');
    }
    
    // Sanitize inputs
    const orderId = body.orderId.trim().substring(0, 100);
    const paymentMethod = body.paymentMethod.toLowerCase().trim();
    const paymentReference = body.paymentReference?.trim().substring(0, 100);
    const amount = body.amount && !isNaN(body.amount) ? Math.abs(body.amount) : undefined;
    
    // Get order details with validation
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, total_amount, status, payment_method, user_id, email')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      await logSecurityEvent(supabaseClient, 'payment_verification_failed', 
        `Order not found: ${orderId}`, 'medium', { orderId });
      throw new Error('Order not found');
    }

    // Verify payment method matches
    if (order.payment_method !== paymentMethod) {
      await logSecurityEvent(supabaseClient, 'payment_method_mismatch', 
        `Payment method mismatch for order ${orderId}`, 'high', 
        { orderId, expectedMethod: order.payment_method, providedMethod: paymentMethod });
      throw new Error('Payment method mismatch');
    }

    // Verify amount if provided
    if (amount && Math.abs(order.total_amount - amount) > 0.01) {
      await logSecurityEvent(supabaseClient, 'payment_amount_mismatch', 
        `Amount mismatch for order ${orderId}`, 'critical', 
        { orderId, expectedAmount: order.total_amount, providedAmount: amount });
      throw new Error('Payment amount mismatch');
    }

    // Prevent double processing
    if (order.status === 'confirmed' || order.status === 'delivered') {
      await logSecurityEvent(supabaseClient, 'duplicate_payment_verification', 
        `Duplicate verification attempt for order ${orderId}`, 'medium', { orderId });
      return new Response(JSON.stringify({ 
        success: true, 
        order,
        message: 'Order already confirmed' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let paymentVerified = false;
    let verificationResult: any = {};

    // Payment method specific verification
    switch (paymentMethod) {
      case 'payfast':
        paymentVerified = await verifyPayFastPayment(body, order);
        break;
      
      case 'payflex':
        paymentVerified = await verifyPayFlexPayment(body, order);
        break;
      
      case 'instant_eft':
      case 'bank_transfer':
      case 'eft':
        paymentVerified = await verifyBankTransfer(body, order);
        break;
      
      case 'cod':
        // COD verification requires admin confirmation
        paymentVerified = false;
        verificationResult.requiresAdminConfirmation = true;
        break;
      
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    const newStatus = paymentVerified ? 'confirmed' : 'pending';
    
    // Update order status with audit trail
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      await logSecurityEvent(supabaseClient, 'order_update_failed', 
        `Failed to update order ${orderId}`, 'high', 
        { orderId, error: updateError.message });
      throw updateError;
    }

    // Log payment verification
    await logSecurityEvent(supabaseClient, 'payment_verified', 
      `Payment verified for order ${orderId}`, 'low', 
      { 
        orderId, 
        paymentMethod, 
        verified: paymentVerified, 
        newStatus,
        paymentReference 
      });

    // Record payment transaction
    await supabaseClient
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        payment_method_type: paymentMethod,
        amount: order.total_amount,
        status: paymentVerified ? 'completed' : 'pending',
        external_transaction_id: paymentReference,
        processed_at: paymentVerified ? new Date().toISOString() : null,
        gateway_response: verificationResult
      });

    // Update stock and send confirmation email if payment verified
    if (paymentVerified) {
      await processConfirmedOrder(supabaseClient, order);
    }

    return new Response(JSON.stringify({
      success: true,
      verified: paymentVerified,
      order: {
        ...order,
        status: newStatus
      },
      verificationResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function verifyPayFastPayment(body: PaymentVerificationRequest, order: any): Promise<boolean> {
  // Implement PayFast signature verification
  // This is a simplified version - implement proper PayFast ITN verification
  if (!body.signature) return false;
  
  // In production, verify the signature against PayFast's merchant key
  // and validate the payment status via PayFast API
  return body.paymentReference !== undefined;
}

async function verifyPayFlexPayment(body: PaymentVerificationRequest, order: any): Promise<boolean> {
  // Implement PayFlex verification
  // This would involve calling PayFlex API to verify payment status
  return body.paymentReference !== undefined;
}

async function verifyBankTransfer(body: PaymentVerificationRequest, order: any): Promise<boolean> {
  // Bank transfers require manual verification
  // Mark as pending for admin review
  return false;
}

async function processConfirmedOrder(supabaseClient: any, order: any) {
  try {
    // Get order items for stock updates
    const { data: orderItems } = await supabaseClient
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order.id);

    // Update stock quantities
    if (orderItems) {
      for (const item of orderItems) {
        await supabaseClient.rpc('update_product_stock', {
          p_product_id: item.product_id,
          p_quantity_change: -item.quantity,
          p_movement_type: 'sale',
          p_order_id: order.id,
          p_notes: 'Stock reduced due to confirmed order'
        });
      }
    }

    // Send order confirmation email
    await supabaseClient.functions.invoke('send-email', {
      body: {
        to: order.email,
        template: 'order-confirmation',
        data: {
          orderNumber: order.order_number,
          orderId: order.id
        }
      }
    });

  } catch (error) {
    console.error('Error processing confirmed order:', error);
    // Don't fail the payment verification if post-processing fails
  }
}

async function logSecurityEvent(
  supabaseClient: any,
  eventType: string,
  description: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  metadata: any = {}
) {
  try {
    await supabaseClient
      .from('security_audit_log')
      .insert({
        event_type: eventType,
        event_description: description,
        risk_level: riskLevel,
        metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}