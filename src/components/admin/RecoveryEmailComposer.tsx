import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Send, Eye, Sparkles, ShoppingCart, Percent, Clock } from 'lucide-react';

interface CartSession {
  id: string;
  email?: string;
  phone?: string;
  total_value: number;
  item_count: number;
  enhanced_cart_tracking?: Array<{
    product_name: string;
    product_price: number;
    quantity: number;
  }>;
}

interface RecoveryEmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartSession: CartSession | null;
  onEmailSent?: () => void;
}

const EMAIL_TEMPLATES = {
  gentle: {
    name: 'Gentle Reminder',
    subject: 'You left something behind!',
    body: `Hi there,

We noticed you left some items in your cart. We've saved them for you!

{CART_ITEMS}

Ready to complete your purchase? Your cart is waiting.

Best regards,
The OZZ Team`,
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  discount: {
    name: 'With Discount',
    subject: 'Here\'s {DISCOUNT}% off to complete your order!',
    body: `Hi there,

We noticed you didn't complete your purchase, and we want to help!

Use code {DISCOUNT_CODE} for {DISCOUNT}% off your order.

{CART_ITEMS}

This offer expires in 24 hours - don't miss out!

Best regards,
The OZZ Team`,
    icon: <Percent className="h-4 w-4" />,
  },
  urgency: {
    name: 'Last Chance',
    subject: 'Last chance! Your cart expires soon',
    body: `Hi there,

Your cart items are selling fast and we can't hold them much longer!

{CART_ITEMS}

Complete your order now before these items are gone.

Best regards,
The OZZ Team`,
    icon: <Clock className="h-4 w-4" />,
  },
  personal: {
    name: 'Personal Touch',
    subject: 'A personal note from OZZ',
    body: `Hi there,

I noticed you were browsing our store and wanted to reach out personally.

If you have any questions about our products or need help with your order, I'm here to assist!

{CART_ITEMS}

Feel free to reply to this email or give us a call.

Warm regards,
The OZZ Team`,
    icon: <Sparkles className="h-4 w-4" />,
  },
};

export const RecoveryEmailComposer: React.FC<RecoveryEmailComposerProps> = ({
  open,
  onOpenChange,
  cartSession,
  onEmailSent,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EMAIL_TEMPLATES>('gentle');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES.gentle.subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES.gentle.body);
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [discountCode, setDiscountCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateChange = (template: keyof typeof EMAIL_TEMPLATES) => {
    setSelectedTemplate(template);
    setSubject(EMAIL_TEMPLATES[template].subject);
    setBody(EMAIL_TEMPLATES[template].body);
    setIncludeDiscount(template === 'discount');
  };

  const generateDiscountCode = () => {
    const code = `RECOVER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setDiscountCode(code);
    return code;
  };

  const getCartItemsText = () => {
    if (!cartSession?.enhanced_cart_tracking || cartSession.enhanced_cart_tracking.length === 0) {
      return `Your cart (R${cartSession?.total_value?.toFixed(2) || '0.00'})`;
    }

    return cartSession.enhanced_cart_tracking
      .map(item => `• ${item.product_name} x${item.quantity} - R${(item.product_price * item.quantity).toFixed(2)}`)
      .join('\n');
  };

  const processContent = (content: string) => {
    let processed = content;
    processed = processed.replace('{CART_ITEMS}', getCartItemsText());
    processed = processed.replace('{DISCOUNT}', discountPercentage.toString());
    processed = processed.replace('{DISCOUNT_CODE}', discountCode || generateDiscountCode());
    processed = processed.replace('{CUSTOMER_NAME}', 'there');
    return processed;
  };

  const handleSendEmail = async () => {
    if (!cartSession?.email) {
      toast.error('No email address available for this customer');
      return;
    }

    setIsSending(true);
    try {
      // Generate discount code if needed
      let finalDiscountCode = discountCode;
      if (includeDiscount && !finalDiscountCode) {
        finalDiscountCode = generateDiscountCode();
      }

      // Create discount code in database if included
      if (includeDiscount && finalDiscountCode) {
        const { error: discountError } = await supabase
          .from('discount_codes')
          .insert({
            code: finalDiscountCode,
            discount_type: 'percentage',
            discount_value: discountPercentage,
            is_active: true,
            max_uses: 1,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            description: `Recovery discount for cart ${cartSession.id}`,
          });

        if (discountError) {
          console.error('Error creating discount code:', discountError);
        }
      }

      // Send the email via edge function
      const { data, error } = await supabase.functions.invoke('send-recovery-email', {
        body: {
          to: cartSession.email,
          subject: processContent(subject),
          body: processContent(body),
          cartSessionId: cartSession.id,
          discountCode: includeDiscount ? finalDiscountCode : undefined,
          discountPercentage: includeDiscount ? discountPercentage : undefined,
        },
      });

      if (error) throw error;

      toast.success('Recovery email sent successfully!');
      onOpenChange(false);
      onEmailSent?.();
    } catch (error) {
      console.error('Failed to send recovery email:', error);
      toast.error('Failed to send recovery email');
    } finally {
      setIsSending(false);
    }
  };

  if (!cartSession) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Recovery Email
          </DialogTitle>
          <DialogDescription>
            Compose and send a personalized recovery email to recover this abandoned cart.
          </DialogDescription>
        </DialogHeader>

        {/* Customer Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Customer</span>
            <span className="font-medium">{cartSession.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cart Value</span>
            <Badge variant="secondary">R{cartSession.total_value.toFixed(2)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Items</span>
            <span>{cartSession.item_count} items</span>
          </div>
        </div>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Email Template</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant={selectedTemplate === key ? 'default' : 'outline'}
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleTemplateChange(key as keyof typeof EMAIL_TEMPLATES)}
                  >
                    {template.icon}
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Discount Option */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="include-discount">Include Discount Code</Label>
                <p className="text-sm text-muted-foreground">
                  Add a special discount to encourage completion
                </p>
              </div>
              <Switch
                id="include-discount"
                checked={includeDiscount}
                onCheckedChange={setIncludeDiscount}
              />
            </div>

            {includeDiscount && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="discount-percentage">Discount %</Label>
                  <Input
                    id="discount-percentage"
                    type="number"
                    min="5"
                    max="50"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount-code">Discount Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="discount-code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Auto-generated"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setDiscountCode(generateDiscountCode())}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: {'{CART_ITEMS}'}, {'{DISCOUNT}'}, {'{DISCOUNT_CODE}'}, {'{CUSTOMER_NAME}'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b">
                <p className="text-sm">
                  <strong>To:</strong> {cartSession.email}
                </p>
                <p className="text-sm">
                  <strong>Subject:</strong> {processContent(subject)}
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-background whitespace-pre-wrap text-sm">
                {processContent(body)}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={isSending || !cartSession.email}>
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
