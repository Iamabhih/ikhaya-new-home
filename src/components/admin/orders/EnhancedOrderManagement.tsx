import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/contexts/AuthContext";
import { useOrderRealtime } from "@/hooks/useOrderRealtime";
import { Clock, AlertCircle, Package, Truck, CheckCircle } from "lucide-react";
import { OrderDetailModal } from "./OrderDetailModal";
import { BulkOrderActions } from "./BulkOrderActions";
import { OrderFilters } from "./OrderFilters";
import { OrderErrorBoundary } from "../../orders/OrderErrorBoundary";
import { useOrderStatusValidation } from "@/hooks/useOrderValidation";
import { useOrderKeyboardShortcuts } from "./useOrderKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { OrderExportDialog } from "./OrderExportDialog";
import { OrderKanbanBoard } from "./OrderKanbanBoard";
import { OrderMetricsDashboard } from "./OrderMetricsDashboard";
import { AutomationRulesPanel } from "./AutomationRulesPanel";
import { OrderSearchBar } from "./order-list/OrderSearchBar";
import { OrderStatistics } from "./order-list/OrderStatistics";
import { ViewModeToggle } from "./order-list/ViewModeToggle";
import { OrderListTable } from "./order-list/OrderListTable";
import { OrderPagination } from "./order-list/OrderPagination";
import { Order } from "./order-list/OrderListItem";

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
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'metrics'>('list');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const itemsPerPage = 20;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);
  const { validateStatusTransition } = useOrderStatusValidation();

  useOrderRealtime({ isAdmin: true });

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', searchQuery, statusFilter, fulfillmentFilter, priorityFilter, sortBy, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, fulfillment_status, priority, total_amount,
          created_at, updated_at, tracking_number, tags, internal_notes,
          customer_notes, shipped_at, delivered_at, email, user_id,
          order_items(id, product_name, quantity, unit_price, total_price)
        `)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (searchQuery) {
        query = query.or(`order_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      if (statusFilter !== "all") query = query.eq('status', statusFilter as any);
      if (fulfillmentFilter !== "all") query = query.eq('fulfillment_status', fulfillmentFilter as any);
      if (priorityFilter !== "all") query = query.eq('priority', priorityFilter as any);

      const [field, direction] = sortBy.split('_');
      const ascending = direction === 'asc';
      query = query.order(field, { ascending });

      const { data, error, count } = await query;
      if (error) throw error;

      const totalCount = count || data?.length || 0;
      return {
        orders: data as Order[],
        totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage)
      };
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_order_stats');
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status, notes }: { orderIds: string[], status: string, notes?: string }) => {
      if (ordersData?.orders) {
        const ordersToUpdate = ordersData.orders.filter(order => orderIds.includes(order.id));
        for (const order of ordersToUpdate) {
          try {
            await new Promise<void>((resolve) => {
              validateStatusTransition({
                orderId: order.id,
                currentStatus: order.status,
                newStatus: status,
              });
              setTimeout(() => resolve(), 100);
            });
          } catch (error) {
            console.warn(`Status validation failed for order ${order.order_number}:`, error);
          }
        }
      }

      const { data, error } = await supabase.rpc('bulk_update_order_status', {
        order_ids: orderIds,
        new_status: status as any,
        notes: notes
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Orders Updated", description: `${data} orders updated successfully` });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      setSelectedOrders([]);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update orders",
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
      toast({ title: "Notification Sent", description: "Customer has been notified" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
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

  const handleQuickStatusUpdate = useCallback((orderId: string, status: string) => {
    updateOrderStatusMutation.mutate({ orderIds: [orderId], status });
  }, [updateOrderStatusMutation]);

  const handleToggleSelect = useCallback((orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder({
      ...order,
      customer_name: order.email || 'Guest',
      customer_email: order.email || 'N/A'
    });
  }, []);

  useOrderKeyboardShortcuts({
    orders: ordersData?.orders || [],
    selectedOrderIndex: keyboardSelectedIndex,
    setSelectedOrderIndex: setKeyboardSelectedIndex,
    onViewOrder: handleViewOrder,
    onQuickStatusUpdate: handleQuickStatusUpdate,
    onToggleSelect: handleToggleSelect,
    isModalOpen: !!selectedOrder,
    onShowHelp: () => setShowKeyboardHelp(true),
  });

  return (
    <OrderErrorBoundary>
      <div className="space-y-6">
        <OrderStatistics stats={stats} />

        <Card>
          <CardContent className="pt-6 space-y-4">
            <OrderSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              fulfillmentFilter={fulfillmentFilter}
              onFulfillmentFilterChange={setFulfillmentFilter}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onExport={() => setShowExportDialog(true)}
            />

            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showAutomation={showAutomation}
              onToggleAutomation={() => setShowAutomation(!showAutomation)}
            />

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

        {selectedOrders.length > 0 && (
          <BulkOrderActions
            selectedOrders={selectedOrders}
            onUpdateStatus={(status, notes) =>
              updateOrderStatusMutation.mutate({ orderIds: selectedOrders, status, notes })
            }
            onClearSelection={() => setSelectedOrders([])}
          />
        )}

        {showAutomation && <AutomationRulesPanel />}

        {viewMode === 'kanban' && <OrderKanbanBoard />}
        {viewMode === 'metrics' && <OrderMetricsDashboard />}

        {viewMode === 'list' && (
          <>
            <OrderListTable
              orders={ordersData?.orders || []}
              isLoading={isLoading}
              selectedOrders={selectedOrders}
              keyboardSelectedIndex={keyboardSelectedIndex}
              isSuperAdmin={isSuperAdmin}
              onSelectAll={handleSelectAll}
              onOrderSelect={handleOrderSelect}
              onViewOrder={handleViewOrder}
              onNotifyOrder={(orderId) => sendNotificationMutation.mutate({ orderId, type: 'status_change' })}
              onKeyboardSelect={setKeyboardSelectedIndex}
              onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
              getFulfillmentIcon={getFulfillmentIcon}
              onOrderUpdated={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
              onOrderDeleted={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
            />

            {ordersData && (
              <OrderPagination
                currentPage={currentPage}
                totalPages={ordersData.totalPages}
                totalCount={ordersData.totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

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

        <KeyboardShortcutsHelp
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />

        <OrderExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          orders={ordersData?.orders || []}
        />
      </div>
    </OrderErrorBoundary>
  );
};
