import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Shield } from "lucide-react";

interface PayFastFormData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url?: string;
  amount: string;
  item_name: string;
  item_description: string;
  m_payment_id: string;
  name_first: string;
  name_last: string;
  email_address: string;
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
  const payFastUrl = isTestMode 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  useEffect(() => {
    // Auto-submit the form when component mounts - unconditional
    const form = document.getElementById('payfast-form') as HTMLFormElement;
    if (form) {
      console.log('[PayFastForm] Auto-submitting to:', payFastUrl);
      console.log('[PayFastForm] Form data:', {
        merchant_id: formData.merchant_id,
        merchant_key: formData.merchant_key ? '***' : 'MISSING',
        return_url: formData.return_url,
        cancel_url: formData.cancel_url,
        notify_url: formData.notify_url,
        amount: formData.amount,
        item_name: formData.item_name,
        m_payment_id: formData.m_payment_id,
        name_first: formData.name_first,
        name_last: formData.name_last,
        email_address: formData.email_address
      });
      
      if (onSubmit) onSubmit();
      form.submit();
    } else {
      console.error('[PayFastForm] Form element not found!');
    }
  }, []);

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
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Please wait while we redirect you to complete your payment securely.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secured by PayFast</span>
            </div>
          </div>

          <form
            id="payfast-form"
            action={payFastUrl}
            method="post"
            style={{ display: 'none' }}
          >
            <input type="hidden" name="merchant_id" value={formData.merchant_id} />
            <input type="hidden" name="merchant_key" value={formData.merchant_key} />
            <input type="hidden" name="return_url" value={formData.return_url} />
            <input type="hidden" name="cancel_url" value={formData.cancel_url} />
            {formData.notify_url && (
              <input type="hidden" name="notify_url" value={formData.notify_url} />
            )}
            <input type="hidden" name="amount" value={formData.amount} />
            <input type="hidden" name="item_name" value={formData.item_name} />
            <input type="hidden" name="item_description" value={formData.item_description} />
            <input type="hidden" name="m_payment_id" value={formData.m_payment_id} />
            <input type="hidden" name="name_first" value={formData.name_first} />
            <input type="hidden" name="name_last" value={formData.name_last} />
            <input type="hidden" name="email_address" value={formData.email_address} />
          </form>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you are not redirected automatically, please click the button below:
            </p>
            <Button
              onClick={() => {
                const form = document.getElementById('payfast-form') as HTMLFormElement;
                if (form) form.submit();
              }}
              className="w-full"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Continue to PayFast
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayFastForm;