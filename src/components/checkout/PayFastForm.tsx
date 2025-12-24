import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Shield, Loader2, AlertCircle } from "lucide-react";
import { usePaymentLogger } from "@/hooks/usePaymentLogger";
import { generateSignature, getOrderedFormFields, PayFastFieldsForSignature } from "@/utils/payment/PayFastSignature";

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
  passphrase?: string;
  onSubmit?: () => void;
}

const PayFastForm: React.FC<PayFastFormProps> = ({ 
  formData, 
  isTestMode = false,
  passphrase,
  onSubmit 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const payFastUrl = isTestMode 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  
  const { logFormSubmitted, logClientError } = usePaymentLogger();

  // Generate signature if passphrase is provided (required for production)
  const signature = passphrase 
    ? generateSignature(formData as PayFastFieldsForSignature, passphrase)
    : undefined;

  // Get ordered fields for form (and debugging)
  const orderedFields = getOrderedFormFields(formData as PayFastFieldsForSignature);

  useEffect(() => {
    // Auto-submit with a small delay to ensure DOM is ready
    const timer = setTimeout(async () => {
      const form = document.getElementById('payfast-form') as HTMLFormElement;
      if (form) {
        console.log('[PayFastForm] Submitting to:', payFastUrl);
        console.log('[PayFastForm] Form fields:', orderedFields.map(f => ({ 
          name: f.name, 
          value: f.name.includes('key') ? '***' : f.value 
        })));
        
        setIsSubmitting(true);
        
        try {
          // Log form submission
          await logFormSubmitted({
            orderNumber: formData.m_payment_id,
            amount: parseFloat(formData.amount),
            email: formData.email_address,
            isTestMode,
            targetUrl: payFastUrl
          });
          
          if (onSubmit) onSubmit();
          form.submit();
        } catch (err) {
          console.error('[PayFastForm] Submit error:', err);
          setError('Failed to submit form. Please click the button below.');
          setIsSubmitting(false);
          
          await logClientError({
            orderNumber: formData.m_payment_id,
            amount: parseFloat(formData.amount)
          }, err instanceof Error ? err.message : 'Form submission error');
        }
      } else {
        console.error('[PayFastForm] Form element not found!');
        setError('Form not found. Please click the button below.');
        
        await logClientError({
          orderNumber: formData.m_payment_id,
          amount: parseFloat(formData.amount)
        }, 'Form element not found during auto-submit');
      }
    }, 500); // 500ms delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  const handleManualSubmit = () => {
    const form = document.getElementById('payfast-form') as HTMLFormElement;
    if (form) {
      setIsSubmitting(true);
      form.submit();
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            <CreditCard className="w-5 h-5" />
            Redirecting to PayFast
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">
                Please wait while we redirect you to complete your payment securely.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Secured by PayFast</span>
              </div>
            </div>
          )}

          {/* PayFast Form - Following official documentation order */}
          <form
            id="payfast-form"
            action={payFastUrl}
            method="post"
            style={{ display: isTestMode ? 'block' : 'none' }}
            className={isTestMode ? "text-left bg-secondary/10 p-4 rounded-lg" : ""}
          >
            {/* Render fields in PayFast-specified order */}
            {orderedFields.map(({ name, value }) => (
              <React.Fragment key={name}>
                <input type="hidden" name={name} value={value} />
                {isTestMode && (
                  <div className="text-xs font-mono mb-1 text-muted-foreground">
                    <span className="font-semibold">{name}:</span>{' '}
                    {name.includes('key') ? '***' : value}
                  </div>
                )}
              </React.Fragment>
            ))}
            
            {/* Add signature last if available */}
            {signature && (
              <>
                <input type="hidden" name="signature" value={signature} />
                {isTestMode && (
                  <div className="text-xs font-mono mb-1 text-muted-foreground">
                    <span className="font-semibold">signature:</span> {signature.substring(0, 16)}...
                  </div>
                )}
              </>
            )}
          </form>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you are not redirected automatically, please click the button below:
            </p>
            <Button
              onClick={handleManualSubmit}
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
                  Continue to PayFast
                </>
              )}
            </Button>
          </div>

          {/* Debug info in test mode */}
          {isTestMode && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
              <p className="text-xs font-semibold text-amber-800 mb-2">Test Mode Debug Info:</p>
              <div className="text-xs text-amber-700 space-y-1">
                <p>• Target URL: {payFastUrl}</p>
                <p>• Order ID: {formData.m_payment_id}</p>
                <p>• Amount: R {formData.amount}</p>
                <p>• Signature: {signature ? 'Generated' : 'Not required (no passphrase)'}</p>
                <p>• Fields: {orderedFields.length} total</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayFastForm;
