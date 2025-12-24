import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Shield, Loader2, AlertCircle } from "lucide-react";
import { usePaymentLogger } from "@/hooks/usePaymentLogger";

interface PayFastFormData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url?: string;
  amount: string;
  item_name: string;
  item_description?: string;
  m_payment_id: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
}

interface PayFastFormProps {
  formData: PayFastFormData;
  isTestMode?: boolean;
  onSubmit?: () => void;
}

const PayFastForm: React.FC<PayFastFormProps> = ({ 
  formData, 
  isTestMode = false,
  onSubmit 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const payFastUrl = isTestMode 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  
  const { logFormSubmitted, logClientError } = usePaymentLogger();

  const handleSubmit = () => {
    if (!formRef.current) {
      setError('Form not ready. Please try again.');
      logClientError({
        orderNumber: formData.m_payment_id,
        amount: parseFloat(formData.amount)
      }, 'Form ref not available').catch(() => {});
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    console.log('[PayFastForm] Submitting to:', payFastUrl);
    console.log('[PayFastForm] Mode:', isTestMode ? 'SANDBOX' : 'PRODUCTION');
    
    // Fire-and-forget logging - don't block on this
    logFormSubmitted({
      orderNumber: formData.m_payment_id,
      amount: parseFloat(formData.amount),
      email: formData.email_address,
      isTestMode,
      targetUrl: payFastUrl
    }).catch((err) => {
      console.warn('[PayFastForm] Logging failed (non-blocking):', err);
    });
    
    // Call onSubmit callback immediately
    if (onSubmit) {
      try {
        onSubmit();
      } catch (err) {
        console.warn('[PayFastForm] onSubmit callback error (non-blocking):', err);
      }
    }
    
    // Submit form immediately - this should redirect the browser
    try {
      formRef.current.submit();
    } catch (err) {
      console.error('[PayFastForm] Form submit failed:', err);
      setError('Failed to redirect. Please try again.');
      setIsSubmitting(false);
      
      logClientError({
        orderNumber: formData.m_payment_id,
        amount: parseFloat(formData.amount)
      }, err instanceof Error ? err.message : 'Form submit exception').catch(() => {});
    }

    // Fallback: if still on page after 3 seconds, show error
    setTimeout(() => {
      setIsSubmitting(false);
      setError('Redirect did not complete. Please click the button again or check your browser settings.');
    }, 3000);
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            <CreditCard className="w-5 h-5" />
            Complete Your Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive text-left">{error}</p>
            </div>
          )}

          {isSubmitting ? (
            <div className="space-y-2">
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">
                Redirecting you to PayFast...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured by PayFast</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Click below to securely complete your payment of <strong>R{formData.amount}</strong>
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured by PayFast</span>
              </div>
            </div>
          )}

          {/* PayFast Form - visually hidden but accessible */}
          <form
            ref={formRef}
            action={payFastUrl}
            method="post"
            className="sr-only"
          >
            {/* Merchant details */}
            <input type="hidden" name="merchant_id" value={formData.merchant_id} />
            <input type="hidden" name="merchant_key" value={formData.merchant_key} />
            
            {/* Return URLs */}
            <input type="hidden" name="return_url" value={formData.return_url} />
            <input type="hidden" name="cancel_url" value={formData.cancel_url} />
            {formData.notify_url && (
              <input type="hidden" name="notify_url" value={formData.notify_url} />
            )}
            
            {/* Buyer details */}
            {formData.name_first && (
              <input type="hidden" name="name_first" value={formData.name_first} />
            )}
            {formData.name_last && (
              <input type="hidden" name="name_last" value={formData.name_last} />
            )}
            {formData.email_address && (
              <input type="hidden" name="email_address" value={formData.email_address} />
            )}
            
            {/* Transaction details */}
            <input type="hidden" name="m_payment_id" value={formData.m_payment_id} />
            <input type="hidden" name="amount" value={formData.amount} />
            <input type="hidden" name="item_name" value={formData.item_name} />
            {formData.item_description && (
              <input type="hidden" name="item_description" value={formData.item_description} />
            )}
          </form>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay with PayFast
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            You will be redirected to PayFast to complete your payment securely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayFastForm;
