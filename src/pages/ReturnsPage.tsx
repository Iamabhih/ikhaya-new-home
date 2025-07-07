
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Package, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

const ReturnsPage = () => {
  const { user } = useAuth();

  const { data: returnRequests = [], isLoading } = useQuery({
    queryKey: ['user-returns', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('return_requests')
        .select(`
          *,
          orders!inner(order_number, total_amount),
          return_items(
            id,
            quantity,
            condition,
            refund_amount,
            order_items(product_name)
          )
        `)
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'processing': return 'default';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Returns & Refunds</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Returns & Refunds</h1>
            <p className="text-muted-foreground">
              Manage your return requests and track refund status. You can return items within 30 days of delivery.
            </p>
          </div>

          {/* Return Policy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Return Window</h3>
                  <p className="text-sm text-muted-foreground">
                    You have 30 days from delivery to return items in original condition.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Refund Process</h3>
                  <p className="text-sm text-muted-foreground">
                    Refunds are processed within 5-7 business days after we receive your return.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Return Shipping</h3>
                  <p className="text-sm text-muted-foreground">
                    Free return shipping for defective items. Customer pays for other returns.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Condition Requirements</h3>
                  <p className="text-sm text-muted-foreground">
                    Items must be unused, in original packaging with all tags attached.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return Requests */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Your Return Requests</h2>
              <Link to="/orders">
                <Button variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  View Orders
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : returnRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <RotateCcw className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No Return Requests</h2>
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any return requests yet.
                  </p>
                  <Link to="/orders">
                    <Button>View Your Orders</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {returnRequests.map((returnRequest) => (
                  <Card key={returnRequest.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Return Request #{returnRequest.id.slice(-8)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Order #{returnRequest.orders.order_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Requested on {new Date(returnRequest.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(returnRequest.status)} className="flex items-center gap-1">
                          {getStatusIcon(returnRequest.status)}
                          {returnRequest.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Return Reason</h4>
                          <p className="text-sm text-muted-foreground">{returnRequest.return_reason}</p>
                          {returnRequest.return_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {returnRequest.return_description}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Items to Return</h4>
                          <div className="space-y-2">
                            {returnRequest.return_items?.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.order_items.product_name} x {item.quantity}</span>
                                <span>R{item.refund_amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {returnRequest.refund_amount && (
                          <div className="border-t pt-4">
                            <div className="flex justify-between font-semibold">
                              <span>Total Refund Amount</span>
                              <span>R{returnRequest.refund_amount}</span>
                            </div>
                          </div>
                        )}

                        {returnRequest.admin_notes && (
                          <div className="bg-muted p-3 rounded">
                            <h4 className="font-medium mb-1">Admin Notes</h4>
                            <p className="text-sm">{returnRequest.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReturnsPage;
