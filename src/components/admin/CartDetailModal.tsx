import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  ShoppingCart, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Monitor, 
  Clock, 
  MapPin,
  Package,
  CreditCard,
  ExternalLink,
  Copy,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface CartTrackingItem {
  id: string;
  product_id?: string;
  product_name: string;
  product_price: number;
  product_sku?: string;
  quantity: number;
  added_at: string;
  removed_at?: string;
  checkout_reached?: boolean;
  payment_attempted?: boolean;
  abandonment_reason?: string;
}

interface CartSession {
  id: string;
  session_id: string;
  user_id?: string;
  email?: string;
  phone?: string;
  total_value: number;
  item_count: number;
  created_at: string;
  updated_at: string;
  abandoned_at?: string;
  converted_at?: string;
  checkout_initiated_at?: string;
  payment_attempted_at?: string;
  abandonment_stage?: string;
  device_info?: {
    userAgent?: string;
    screenResolution?: string;
    language?: string;
    platform?: string;
  };
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  session_duration?: number;
  page_views?: number;
  enhanced_cart_tracking?: CartTrackingItem[];
}

interface CartDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartSession: CartSession | null;
  onSendEmail?: () => void;
}

export const CartDetailModal: React.FC<CartDetailModalProps> = ({
  open,
  onOpenChange,
  cartSession,
  onSendEmail,
}) => {
  if (!cartSession) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
  };

  const getTimeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getDeviceBrowser = () => {
    const ua = cartSession.device_info?.userAgent || '';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getDevicePlatform = () => {
    const ua = cartSession.device_info?.userAgent || '';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  };

  const getAbandonmentStageColor = () => {
    switch (cartSession.abandonment_stage) {
      case 'payment': return 'destructive';
      case 'checkout': return 'secondary';
      case 'cart': return 'outline';
      default: return 'outline';
    }
  };

  const items = cartSession.enhanced_cart_tracking || [];

  // Build journey timeline
  const journeyEvents = [
    { 
      label: 'Cart Created', 
      time: cartSession.created_at, 
      completed: true,
      icon: <ShoppingCart className="h-4 w-4" />
    },
    { 
      label: 'Items Added', 
      time: items[0]?.added_at || cartSession.created_at, 
      completed: items.length > 0,
      icon: <Package className="h-4 w-4" />
    },
    { 
      label: 'Checkout Started', 
      time: cartSession.checkout_initiated_at, 
      completed: !!cartSession.checkout_initiated_at,
      icon: <CreditCard className="h-4 w-4" />
    },
    { 
      label: 'Payment Attempted', 
      time: cartSession.payment_attempted_at, 
      completed: !!cartSession.payment_attempted_at,
      icon: <CreditCard className="h-4 w-4" />
    },
    { 
      label: 'Abandoned', 
      time: cartSession.abandoned_at || cartSession.updated_at, 
      completed: !cartSession.converted_at,
      icon: <Clock className="h-4 w-4" />,
      isNegative: true
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this abandoned cart session
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Customer & Cart Info */}
          <div className="space-y-4">
            {/* Customer Information */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cartSession.email ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{cartSession.email}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(cartSession.email!, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>No email captured</span>
                  </div>
                )}

                {cartSession.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{cartSession.phone}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(cartSession.phone!, 'Phone')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {cartSession.user_id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">Registered User</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="text-xl font-bold text-primary">
                    R{cartSession.total_value.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Items</span>
                  <span>{cartSession.item_count} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stage</span>
                  <Badge variant={getAbandonmentStageColor()}>
                    {cartSession.abandonment_stage || 'cart'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>{getTimeAgo(cartSession.updated_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Device & Source Info */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Device & Source
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Browser</span>
                  <span>{getDeviceBrowser()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span>{getDevicePlatform()}</span>
                </div>
                {cartSession.device_info?.screenResolution && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Screen</span>
                    <span>{cartSession.device_info.screenResolution}</span>
                  </div>
                )}
                {cartSession.utm_source && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UTM Source</span>
                      <Badge variant="outline">{cartSession.utm_source}</Badge>
                    </div>
                  </>
                )}
                {cartSession.utm_medium && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTM Medium</span>
                    <span>{cartSession.utm_medium}</span>
                  </div>
                )}
                {cartSession.utm_campaign && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTM Campaign</span>
                    <span>{cartSession.utm_campaign}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Items & Timeline */}
          <div className="space-y-4">
            {/* Cart Items */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Cart Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className={`flex justify-between items-center p-2 rounded-lg border ${
                          item.removed_at ? 'opacity-50 bg-muted' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product_name}</p>
                          {item.product_sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.product_sku}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added {getTimeAgo(item.added_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">R{(item.product_price * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No item details available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Customer Journey */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Customer Journey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {journeyEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 ${
                        !event.completed ? 'opacity-40' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.completed
                            ? event.isNegative
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {event.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.time && event.completed && (
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(event.time)}
                          </p>
                        )}
                      </div>
                      {event.completed && (
                        <Badge variant={event.isNegative ? 'destructive' : 'secondary'} className="text-xs">
                          {event.isNegative ? 'Lost' : 'Done'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {cartSession.phone && (
            <Button
              variant="outline"
              onClick={() => window.open(`https://wa.me/${cartSession.phone.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          {cartSession.email && onSendEmail && (
            <Button onClick={onSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Send Recovery Email
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
