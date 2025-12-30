import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useCartAnalytics } from '@/hooks/useCartAnalytics';
import { 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Mail, 
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Send,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RecoveryEmailComposer } from './RecoveryEmailComposer';
import { CartDetailModal } from './CartDetailModal';

interface CartAbandonmentDashboardProps {
  className?: string;
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
  device_info?: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  session_duration?: number;
  page_views?: number;
  enhanced_cart_tracking?: any[];
}

export const CartAbandonmentDashboard: React.FC<CartAbandonmentDashboardProps> = ({ className }) => {
  const {
    abandonedCarts,
    recoveryCampaigns,
    customerMetrics,
    snapshots,
    metrics,
    recoveryOpportunities,
    isLoadingCarts,
    isLoadingCampaigns,
    triggerRecoveryCampaign,
    refetchAnalytics
  } = useCartAnalytics();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState<'1hr' | '24hr' | '72hr' | '1week'>('1hr');
  const [includeDiscount, setIncludeDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [selectedCarts, setSelectedCarts] = useState<string[]>([]);
  
  // New state for enhanced features
  const [selectedCart, setSelectedCart] = useState<CartSession | null>(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCartDetail, setShowCartDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('all');

  const handleSendRecoveryCampaign = async (campaignType: '1hr' | '24hr' | '72hr' | '1week' | 'manual', cartIds?: string[]) => {
    try {
      await triggerRecoveryCampaign.mutateAsync({
        campaignType,
        cartSessionIds: cartIds,
        includeDiscount,
        discountPercentage: includeDiscount ? discountPercentage : undefined
      });
      setShowRecoveryDialog(false);
      setSelectedCarts([]);
    } catch (error) {
      console.error('Recovery campaign failed:', error);
    }
  };

  // Filter carts based on search and filters
  const filteredCarts = abandonedCarts?.filter((cart: CartSession) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!cart.email?.toLowerCase().includes(search) && 
          !cart.phone?.includes(search)) {
        return false;
      }
    }
    
    // Stage filter
    if (filterStage !== 'all') {
      if (cart.abandonment_stage !== filterStage) return false;
    }
    
    // Value filter
    if (filterValue !== 'all') {
      if (filterValue === 'high' && cart.total_value < 500) return false;
      if (filterValue === 'medium' && (cart.total_value < 100 || cart.total_value >= 500)) return false;
      if (filterValue === 'low' && cart.total_value >= 100) return false;
    }
    
    return true;
  }) || [];

  // Get carts with emails for quick recovery
  const recoverable = abandonedCarts?.filter((cart: CartSession) => cart.email) || [];

  const handleViewCart = (cart: CartSession) => {
    setSelectedCart(cart);
    setShowCartDetail(true);
  };

  const handleSendEmail = (cart: CartSession) => {
    setSelectedCart(cart);
    setShowEmailComposer(true);
  };

  const formatCurrency = (amount: number) => `R${amount.toFixed(2)}`;
  const formatDateTime = (dateString: string) => format(new Date(dateString), 'MMM dd, yyyy HH:mm');

  if (isLoadingCarts) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cart Abandonment Analytics</h2>
          <p className="text-muted-foreground">Monitor and recover lost sales opportunities</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => refetchAnalytics()}
            variant="outline" 
            size="sm"
            disabled={isLoadingCarts}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCarts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send Recovery Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send Recovery Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Campaign Type</Label>
                  <select 
                    value={selectedCampaignType}
                    onChange={(e) => setSelectedCampaignType(e.target.value as any)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="1hr">1 Hour Follow-up</option>
                    <option value="24hr">24 Hour Reminder</option>
                    <option value="72hr">72 Hour Last Chance</option>
                    <option value="1week">1 Week Check-in</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={includeDiscount}
                    onCheckedChange={setIncludeDiscount}
                  />
                  <Label>Include Discount Code</Label>
                </div>
                {includeDiscount && (
                  <div>
                    <Label>Discount Percentage</Label>
                    <Input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      min="5"
                      max="50"
                      className="mt-1"
                    />
                  </div>
                )}
                <Button 
                  onClick={() => handleSendRecoveryCampaign(selectedCampaignType)}
                  className="w-full"
                  disabled={triggerRecoveryCampaign.isPending}
                >
                  {triggerRecoveryCampaign.isPending ? 'Sending...' : 'Send Campaign'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Abandoned Carts</p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalAbandonedCarts}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lost Revenue</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalAbandonedValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Cart Value</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.avgCartValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Value Carts</p>
                <p className="text-2xl font-bold text-foreground">{metrics.highValueCarts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recovery Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">1 Hour</h4>
                <Badge variant="destructive">{recoveryOpportunities.oneHour.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {formatCurrency(recoveryOpportunities.oneHour.reduce((sum, cart) => sum + cart.total_value, 0))} potential
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleSendRecoveryCampaign('1hr', recoveryOpportunities.oneHour.map(c => c.id))}
                disabled={recoveryOpportunities.oneHour.length === 0}
              >
                Send Campaign
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">24 Hours</h4>
                <Badge variant="secondary">{recoveryOpportunities.twentyFourHour.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {formatCurrency(recoveryOpportunities.twentyFourHour.reduce((sum, cart) => sum + cart.total_value, 0))} potential
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleSendRecoveryCampaign('24hr', recoveryOpportunities.twentyFourHour.map(c => c.id))}
                disabled={recoveryOpportunities.twentyFourHour.length === 0}
              >
                Send Campaign
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">72 Hours</h4>
                <Badge variant="outline">{recoveryOpportunities.seventyTwoHour.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {formatCurrency(recoveryOpportunities.seventyTwoHour.reduce((sum, cart) => sum + cart.total_value, 0))} potential
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleSendRecoveryCampaign('72hr', recoveryOpportunities.seventyTwoHour.map(c => c.id))}
                disabled={recoveryOpportunities.seventyTwoHour.length === 0}
              >
                Send Campaign
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">1 Week</h4>
                <Badge variant="outline">{recoveryOpportunities.oneWeek.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {formatCurrency(recoveryOpportunities.oneWeek.reduce((sum, cart) => sum + cart.total_value, 0))} potential
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => handleSendRecoveryCampaign('1week', recoveryOpportunities.oneWeek.map(c => c.id))}
                disabled={recoveryOpportunities.oneWeek.length === 0}
              >
                Send Campaign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <Tabs defaultValue="abandoned-carts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="abandoned-carts">Abandoned Carts</TabsTrigger>
          <TabsTrigger value="campaigns">Recovery Campaigns</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="abandoned-carts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Abandoned Carts</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-48"
                  />
                </div>
                <Select value={filterStage} onValueChange={setFilterStage}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="cart">Cart</SelectItem>
                    <SelectItem value="checkout">Checkout</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-sm text-muted-foreground">
                Showing {filteredCarts.length} carts ({recoverable.length} with emails)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Items</th>
                      <th className="text-left p-2">Value</th>
                      <th className="text-left p-2">Last Updated</th>
                      <th className="text-left p-2">Stage</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCarts.slice(0, 20).map((cart: CartSession) => (
                      <tr key={cart.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{cart.email || 'Anonymous'}</p>
                            <p className="text-sm text-muted-foreground">
                              {cart.utm_source && `Source: ${cart.utm_source}`}
                            </p>
                          </div>
                        </td>
                        <td className="p-2">{cart.item_count}</td>
                        <td className="p-2 font-medium">{formatCurrency(cart.total_value)}</td>
                        <td className="p-2">{formatDateTime(cart.updated_at)}</td>
                        <td className="p-2">
                          <Badge variant={cart.abandonment_stage === 'payment' ? 'destructive' : 'secondary'}>
                            {cart.abandonment_stage || 'cart'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleViewCart(cart)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {cart.email && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSendEmail(cart)}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Campaign History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-left p-2">Recipient</th>
                      <th className="text-left p-2">Sent</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recoveryCampaigns?.slice(0, 10).map((campaign) => (
                      <tr key={campaign.id} className="border-b">
                        <td className="p-2">
                          <Badge variant="outline">{campaign.campaign_type}</Badge>
                        </td>
                        <td className="p-2">{campaign.email_address}</td>
                        <td className="p-2">{formatDateTime(campaign.sent_at)}</td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              campaign.status === 'converted' ? 'default' :
                              campaign.status === 'opened' ? 'secondary' :
                              campaign.status === 'failed' ? 'destructive' : 'outline'
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {campaign.discount_code && (
                            <span className="font-mono text-sm">
                              {campaign.discount_percentage}% - {campaign.discount_code}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Engagement Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {customerMetrics?.filter(c => c.customer_segment === 'vip').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">VIP Customers</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-warning">
                    {customerMetrics?.filter(c => c.customer_segment === 'at_risk').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">At Risk</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-destructive">
                    {customerMetrics?.filter(c => c.customer_segment === 'churned').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Churned</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Segment</th>
                      <th className="text-left p-2">LTV</th>
                      <th className="text-left p-2">Orders</th>
                      <th className="text-left p-2">Abandoned Carts</th>
                      <th className="text-left p-2">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerMetrics?.slice(0, 10).map((customer) => (
                      <tr key={customer.id} className="border-b">
                        <td className="p-2">{customer.email}</td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              customer.customer_segment === 'vip' ? 'default' :
                              customer.customer_segment === 'at_risk' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {customer.customer_segment}
                          </Badge>
                        </td>
                        <td className="p-2 font-medium">{formatCurrency(customer.lifetime_value || 0)}</td>
                        <td className="p-2">{customer.total_orders}</td>
                        <td className="p-2">{customer.total_abandoned_carts}</td>
                        <td className="p-2">
                          {customer.days_since_last_order !== null 
                            ? `${customer.days_since_last_order} days ago`
                            : 'Never'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RecoveryEmailComposer
        open={showEmailComposer}
        onOpenChange={setShowEmailComposer}
        cartSession={selectedCart}
        onEmailSent={() => refetchAnalytics()}
      />

      <CartDetailModal
        open={showCartDetail}
        onOpenChange={setShowCartDetail}
        cartSession={selectedCart}
        onSendEmail={() => {
          setShowCartDetail(false);
          setShowEmailComposer(true);
        }}
      />
    </div>
  );
};