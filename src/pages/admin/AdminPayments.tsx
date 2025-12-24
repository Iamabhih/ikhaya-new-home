import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, TrendingUp, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const AdminPayments = () => {
  // Fetch payment metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['payment-metrics'],
    queryFn: async () => {
      // Get total revenue from completed orders
      const { data: completedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, payment_status')
        .in('payment_status', ['paid', 'complete']);
      
      if (ordersError) throw ordersError;

      const totalRevenue = completedOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const successfulPayments = completedOrders?.length || 0;

      // Get failed payments
      const { data: failedOrders, error: failedError } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_status', 'failed');
      
      if (failedError) throw failedError;

      // Get pending payments
      const { data: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_status', 'pending');
      
      if (pendingError) throw pendingError;

      return {
        totalRevenue,
        successfulPayments,
        failedPayments: failedOrders?.length || 0,
        pendingPayments: pendingOrders?.length || 0
      };
    }
  });

  // Fetch recent transactions from orders
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, email, total_amount, payment_status, payment_method, created_at, billing_address')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch failed payments
  const { data: failedPayments, isLoading: failedLoading } = useQuery({
    queryKey: ['failed-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, email, total_amount, payment_status, payment_method, created_at, billing_address')
        .in('payment_status', ['failed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch payment logs
  const { data: paymentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['payment-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  const getPaymentStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
      case 'complete':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getCustomerName = (billingAddress: any): string => {
    if (typeof billingAddress === 'object' && billingAddress) {
      return billingAddress.name || billingAddress.first_name || 'Guest';
    }
    return 'Guest';
  };

  const isLoading = metricsLoading || transactionsLoading;

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Payment Management</h1>
                <p className="text-muted-foreground">
                  Monitor payment transactions and manage payment methods
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetchMetrics()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `R ${(metrics?.totalRevenue || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  From paid orders
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Successful Payments
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.successfulPayments || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed transactions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Failed Payments
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {isLoading ? '...' : metrics?.failedPayments || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Payments
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.pendingPayments || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting confirmation
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
              <TabsTrigger value="failed">Failed Payments ({failedPayments?.length || 0})</TabsTrigger>
              <TabsTrigger value="logs">Payment Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payment Transactions</CardTitle>
                  <CardDescription>
                    Latest payment activity from your store
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentTransactions?.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No transactions found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentTransactions?.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.payment_status === 'paid' || transaction.payment_status === 'complete'
                                ? 'bg-green-100'
                                : transaction.payment_status === 'failed'
                                ? 'bg-red-100'
                                : 'bg-yellow-100'
                            }`}>
                              <CreditCard className={`h-5 w-5 ${
                                transaction.payment_status === 'paid' || transaction.payment_status === 'complete'
                                  ? 'text-green-600'
                                  : transaction.payment_status === 'failed'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">Order #{transaction.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {getCustomerName(transaction.billing_address)} • {transaction.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(transaction.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="font-medium">R {transaction.total_amount?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                              {getPaymentStatusBadge(transaction.payment_status)}
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/orders`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="failed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Failed Payment Transactions</CardTitle>
                  <CardDescription>
                    Payments that require attention or recovery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {failedLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : failedPayments?.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No failed payments found</p>
                      <p className="text-sm text-muted-foreground mt-2">Great! All payments are processing correctly.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {failedPayments?.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">Order #{payment.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {getCustomerName(payment.billing_address)} • {payment.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="font-medium">R {payment.total_amount?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                              {getPaymentStatusBadge(payment.payment_status)}
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/admin/order-recovery">
                                Recover
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Gateway Logs</CardTitle>
                  <CardDescription>
                    Raw payment gateway events and webhooks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : paymentLogs?.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No payment logs recorded yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Payment logs will appear here when transactions are processed via PayFast.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentLogs?.map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{log.event_type}</span>
                              {log.payment_status && (
                                <Badge variant="outline" className="ml-2">{log.payment_status}</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'PPp')}
                            </span>
                          </div>
                          {log.m_payment_id && (
                            <p className="text-muted-foreground">Payment ID: {log.m_payment_id}</p>
                          )}
                          {log.error_message && (
                            <p className="text-destructive text-sm mt-1">{log.error_message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminPayments;
