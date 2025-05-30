
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailData {
  type: 'order-confirmation' | 'order-status' | 'welcome' | 'admin-notification';
  to: string;
  data: any;
  userId?: string;
}

export const useEmailService = () => {
  const sendEmail = async (emailData: EmailData) => {
    try {
      console.log('Sending email:', emailData);
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData,
      });

      if (error) {
        console.error('Email sending failed:', error);
        toast.error('Failed to send email');
        throw error;
      }

      console.log('Email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in sendEmail:', error);
      throw error;
    }
  };

  const sendOrderConfirmation = async (orderData: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    orderDate: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    shipping: number;
    total: number;
    shippingAddress: any;
    userId?: string;
  }) => {
    return sendEmail({
      type: 'order-confirmation',
      to: orderData.customerEmail,
      userId: orderData.userId,
      data: {
        customerName: orderData.customerName,
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        total: orderData.total,
        shippingAddress: orderData.shippingAddress,
      },
    });
  };

  const sendOrderStatusUpdate = async (statusData: {
    customerEmail: string;
    customerName: string;
    orderNumber: string;
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    userId?: string;
  }) => {
    return sendEmail({
      type: 'order-status',
      to: statusData.customerEmail,
      userId: statusData.userId,
      data: {
        customerName: statusData.customerName,
        orderNumber: statusData.orderNumber,
        status: statusData.status,
        trackingNumber: statusData.trackingNumber,
        estimatedDelivery: statusData.estimatedDelivery,
      },
    });
  };

  const sendWelcomeEmail = async (userData: {
    email: string;
    firstName: string;
    userId: string;
  }) => {
    return sendEmail({
      type: 'welcome',
      to: userData.email,
      userId: userData.userId,
      data: {
        firstName: userData.firstName,
        email: userData.email,
      },
    });
  };

  const sendAdminNotification = async (notificationData: {
    type: 'new-order' | 'low-stock' | 'return-request' | 'contact-form';
    subject: string;
    message: string;
    data?: any;
    actionUrl?: string;
    actionText?: string;
  }) => {
    // Send to admin email - you might want to make this configurable
    const adminEmail = "admin@yourstore.com"; // Change this to your admin email
    
    return sendEmail({
      type: 'admin-notification',
      to: adminEmail,
      data: notificationData,
    });
  };

  return {
    sendEmail,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendWelcomeEmail,
    sendAdminNotification,
  };
};
