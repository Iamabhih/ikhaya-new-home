import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Edit,
  Send,
  Download,
  MoreHorizontal
} from "lucide-react";
import { OrderDetailModal } from "./OrderDetailModal";
import { BulkOrderActions } from "./BulkOrderActions";
import { OrderFilters } from "./OrderFilters";
import { OrderTimeline } from "./OrderTimeline";

interface Order {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  priority: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  tracking_number?: string;
  internal_notes?: string;
  customer_notes?: string;
  shipped_at?: string;
  delivered_at?: string;
  email: string;
  user_id: string | null;
  customer_name?: string;
  customer_email?: string;
  profiles?: any;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export const EnhancedOrderManagement = () => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders with enhanced filtering
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', searchQuery, statusFilter, fulfillmentFilter, priorityFilter, sortBy, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          fulfillment_status,
          priority,
          total_amount,
          created_at,
          updated_at,
          tracking_number,
          tags,
          internal_notes,
          customer_notes,
          shipped_at,
          delivered_at,
          email,
          user_id,
          order_items(
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`order_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as any);
      }

      // Apply fulfillment filter
      if (fulfillmentFilter !== "all") {
        query = query.eq('fulfillment_status', fulfillmentFilter as any);
      }

      // Apply priority filter
      if (priorityFilter !== "all") {
        query = query.eq('priority', priorityFilter as any);
      }

      // Apply sorting
      const sortParts = sortBy.split('_');
      const direction = sortParts.pop(); // Get the last part (asc/desc)
      const field = sortParts.join('_'); // Join the remaining parts (handles created_at)
      query = query.order(field, { ascending: direction === 'asc' });

      const { data, error, count } = await query;
      if (error) throw error;

      return { 
        orders: data || [], 
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      };
    },
  });

  // Fetch order statistics
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status, fulfillment_status, priority');
      
      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(o => o.status === 'pending').length,
        processing: data.filter(o => o.status === 'processing').length,
        fulfilled: data.filter(o => o.fulfillment_status === 'fulfilled').length,
        shipped: data.filter(o => o.status === 'shipped').length,
        delivered: data.filter(o => o.status === 'delivered').length,
        urgent: data.filter(o => o.priority === 'urgent').length,
      };

      return stats;
    },
  });

  // Bulk status update mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status, notes }: { orderIds: string[], status: string, notes?: string }) => {
      const { data, error } = await supabase.rpc('bulk_update_order_status', {
        order_ids: orderIds,
        new_status: status as any,
        notes: notes
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Orders Updated",
        description: `${data} orders updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update orders",
        variant: "destructive",
      });
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ orderId, type, metadata }: { orderId: string, type: string, metadata?: any }) => {
      const { data, error } = await supabase.functions.invoke('send-order-notification', {
        body: { orderId, type, metadata }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "Customer has been notified",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(ordersData?.orders.map(order => order.id) || []);
    } else {
      setSelectedOrders([]);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getFulfillmentIcon = (status: string) => {
    switch (status) {
      case 'unfulfilled': return <Clock className="h-4 w-4" />;
      case 'partially_fulfilled': return <AlertCircle className="h-4 w-4" />;
      case 'fulfilled': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processing || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.shipped || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.urgent || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by number, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fulfillment</SelectItem>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                  <SelectItem value="partially_fulfilled">Partial</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <OrderFilters 
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <BulkOrderActions
          selectedOrders={selectedOrders}
          onUpdateStatus={(status, notes) => 
            updateOrderStatusMutation.mutate({ orderIds: selectedOrders, status, notes })
          }
          onClearSelection={() => setSelectedOrders([])}
        />
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedOrders.length === ordersData?.orders.length && ordersData?.orders.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedOrders.length} of {ordersData?.orders.length || 0} selected
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {ordersData?.orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleOrderSelect(order.id, checked as boolean)}
                      />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.order_number}</span>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getFulfillmentIcon(order.fulfillment_status)}
                            <span className="text-sm text-muted-foreground">
                              {order.fulfillment_status}
                            </span>
                          </div>
                          {order.priority === 'urgent' && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{order.email || 'Guest'}</span>
                          <span>R{order.total_amount.toFixed(2)}</span>
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder({
                          ...order,
                          customer_name: order.email || 'Guest',
                          customer_email: order.email || 'N/A'
                        })}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendNotificationMutation.mutate({ 
                          orderId: order.id, 
                          type: 'status_change' 
                        })}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Notify
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {ordersData && ordersData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, ordersData.totalCount)} of {ordersData.totalCount} orders
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === ordersData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={(status, notes) => 
            updateOrderStatusMutation.mutate({ orderIds: [selectedOrder.id], status, notes })
          }
          onSendNotification={(type, metadata) => 
            sendNotificationMutation.mutate({ orderId: selectedOrder.id, type, metadata })
          }
        />
      )}
    </div>
  );
};