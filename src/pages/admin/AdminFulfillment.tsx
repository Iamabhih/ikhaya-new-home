import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Search,
  Printer,
  FileText,
  Box
} from "lucide-react";
import { PackingSlipDialog } from "@/components/admin/orders/PackingSlipDialog";

const AdminFulfillment = () => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [packingSlipOrder, setPackingSlipOrder] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders ready for fulfillment
  const { data: orders, isLoading } = useQuery({
    queryKey: ['fulfillment-orders', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            total_price
          )
        `)
        .in('fulfillment_status', ['unfulfilled', 'partially_fulfilled'])
        .in('status', ['processing', 'pending'])
        .order('created_at', { ascending: true });

      if (searchQuery) {
        query = query.or(`order_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Mark as fulfilled mutation
  const fulfillMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          fulfillment_status: 'fulfilled',
          status: 'processing'
        })
        .in('id', orderIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Orders marked as fulfilled" });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      setSelectedOrders([]);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to fulfill orders", description: error.message, variant: "destructive" });
    },
  });

  // Mark as shipped mutation
  const shipMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { error } = await supabase
        .from('orders')
        .update({
          fulfillment_status: 'shipped',
          status: 'shipped',
          shipped_at: new Date().toISOString()
        })
        .in('id', orderIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Orders marked as shipped" });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      setSelectedOrders([]);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to ship orders", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders?.map(o => o.id) || []);
    } else {
      setSelectedOrders([]);
    }
  };

  const stats = {
    total: orders?.length || 0,
    urgent: orders?.filter(o => o.priority === 'urgent').length || 0,
    today: orders?.filter(o => {
      const created = new Date(o.created_at);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fulfillment Center</h1>
            <p className="text-muted-foreground">Pack and ship orders efficiently</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Box className="h-4 w-4" />
                Ready to Pack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                <Package className="h-4 w-4" />
                Urgent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.urgent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                New Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedOrders.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={() => fulfillMutation.mutate(selectedOrders)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Fulfilled ({selectedOrders.length})
                  </Button>
                  <Button variant="secondary" onClick={() => shipMutation.mutate(selectedOrders)}>
                    <Truck className="h-4 w-4 mr-2" />
                    Mark Shipped ({selectedOrders.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders to Fulfill</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedOrders.length === orders?.length && orders?.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : orders?.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">No orders waiting to be fulfilled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders?.map((order) => (
                  <div 
                    key={order.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">#{order.order_number}</span>
                            {order.priority === 'urgent' && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                            <Badge variant="outline">{order.fulfillment_status}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setPackingSlipOrder(order)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Packing Slip
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {order.email} • {new Date(order.created_at).toLocaleString()}
                        </div>
                        {/* Items checklist */}
                        <div className="bg-muted/50 rounded p-3 space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <Checkbox />
                              <span className="flex-1">
                                {item.product_name} 
                                {item.product_sku && <span className="text-muted-foreground"> ({item.product_sku})</span>}
                              </span>
                              <span className="font-medium">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Packing Slip Dialog */}
      {packingSlipOrder && (
        <PackingSlipDialog 
          order={packingSlipOrder}
          isOpen={!!packingSlipOrder}
          onClose={() => setPackingSlipOrder(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminFulfillment;
