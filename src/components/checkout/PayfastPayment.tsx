import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";

interface PayfastPaymentProps {
  orderData: {
    orderId: string;
    amount: number;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    items: Array<{
      name: string;
      description?: string;
      quantity: number;
      amount: number;
    }>;
  };
}

export const PayfastPayment = ({ orderData }: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualRedirect, setShowManualRedirect] = useState(false);
  const [payfastUrl, setPayfastUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<Record<string, string>>({});

  const handlePayment = async () => {
    setIsProcessing(true);
    setShowManualRedirect(false);
    
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication required. Please sign in.');
      }
      
      if (!session) {
        throw new Error('You must be signed in to make a payment.');
      }
      
      console.log('🔄 Calling PayFast payment with order data:', {
        ...orderData,
        customerEmail: orderData.customerEmail.substring(0, 3) + '***'
      });
      
      const { data, error } = await supabase.functions.invoke('payfast-payment', {
        body: orderData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('✅ PayFast function response:', { success: data?.success, hasUrl: !!data?.payfast_url });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Payment service error');
      }

      if (data?.success) {
        console.log('🎯 Payment initiation successful, attempting redirect...');
        
        // Store PayFast data for fallback
        setPayfastUrl(data.payfast_url);
        setPaymentData(data.payment_data);
        
        // Detect environment
        const isLovablePreview = window.location.hostname.includes('lovableproject.com');
        console.log('🌍 Environment:', isLovablePreview ? 'Lovable Preview' : 'Production');
        
        if (isLovablePreview) {
          // In Lovable preview, show manual redirect immediately
          console.log('📱 Lovable preview detected - showing manual redirect');
          setShowManualRedirect(true);
          setIsProcessing(false);
          return;
        }

        // Try automatic form submission with timeout
        console.log('🚀 Attempting automatic form submission...');
        const success = await attemptFormSubmission(data.payfast_url, data.payment_data);
        
        if (!success) {
          console.log('⚠️ Form submission failed - showing manual redirect');
          setShowManualRedirect(true);
        }
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('💥 Payment error:', error);
      const errorMessage = error.message || 'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const attemptFormSubmission = (url: string, paymentData: Record<string, string>): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        console.log('📝 Creating form for PayFast submission...');
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        form.style.display = 'none';
        form.target = '_self';

        // Add all PayFast parameters
        Object.entries(paymentData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('📋 Form created and appended to DOM');
        
        // Set timeout to detect if submission freezes
        const timeout = setTimeout(() => {
          console.log('⏰ Form submission timeout - likely blocked');
          document.body.removeChild(form);
          resolve(false);
        }, 3000);
        
        // Try to submit the form
        setTimeout(() => {
          console.log('🎯 Submitting form to PayFast...');
          try {
            form.submit();
            // If we get here, submission might have worked
            clearTimeout(timeout);
            resolve(true);
          } catch (error) {
            console.log('❌ Form submission error:', error);
            clearTimeout(timeout);
            document.body.removeChild(form);
            resolve(false);
          }
        }, 100);
        
      } catch (error) {
        console.log('🚫 Form creation error:', error);
        resolve(false);
      }
    });
  };

  const handleManualRedirect = () => {
    if (!payfastUrl || !paymentData) {
      toast.error('Payment data not available. Please try again.');
      return;
    }

    console.log('🔗 Opening PayFast in new tab...');
    
    // Create form for new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payfastUrl;
    form.target = '_blank';
    form.style.display = 'none';

    Object.entries(paymentData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    toast.success('PayFast payment page opened in new tab');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          PayFast Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/10 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Order:</span>
              <span>{orderData.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">R {orderData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{orderData.customerEmail}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            You will be redirected to PayFast's secure payment page
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>🔒</span>
            <span>Secured by PayFast - South Africa's leading payment gateway</span>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with PayFast
            </>
          )}
        </Button>

        {showManualRedirect && (
          <div className="border border-warning/20 bg-warning/5 p-4 rounded-lg space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium text-warning-foreground">
                Automatic redirect blocked
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click below to continue to PayFast in a new tab
              </p>
            </div>
            <Button
              onClick={handleManualRedirect}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Continue to PayFast
            </Button>
          </div>
        )}

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Accepts:</span>
            <span className="font-medium">VISA</span>
            <span>•</span>
            <span className="font-medium">MasterCard</span>
            <span>•</span>
            <span className="font-medium">EFT</span>
            <span>•</span>
            <span className="font-medium">Instant EFT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};