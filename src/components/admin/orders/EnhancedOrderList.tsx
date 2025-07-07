import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { OrdersHeader } from "./OrdersHeader";
import { OrdersMetrics } from "./OrdersMetrics";
import { OrdersTable } from "./OrdersTable";
import { OrderDetailsModal } from "../OrderDetailsModal";
import { Button } from "@/components/ui/button";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
};

export const EnhancedOrderList = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const ITEMS_PER_PAGE = 25;

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', debouncedSearchTerm, statusFilter, dateFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `, { count: 'exact' });

      // Apply search filter
      if (debouncedSearchTerm) {
        query = query.or(`order_number.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`);
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter as OrderStatus);
      }

      // Apply date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter":
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        orders: data || [],
        totalCount: count || 0
      };
    },
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedOrders.length === 0) return;

    try {
      switch (action) {
        case 'fulfill':
          await Promise.all(
            selectedOrders.map(orderId => 
              updateOrderStatus(orderId, 'delivered' as OrderStatus)
            )
          );
          break;
        case 'ship':
          await Promise.all(
            selectedOrders.map(orderId => 
              updateOrderStatus(orderId, 'shipped' as OrderStatus)
            )
          );
          break;
        case 'export':
          // Handle export functionality
          toast.success('Export functionality coming soon');
          break;
        case 'archive':
          toast.success('Archive functionality coming soon');
          break;
      }
      setSelectedOrders([]);
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
    setSelectedOrders([]);
  };

  const exportOrders = async () => {
    toast.success("Export feature coming soon");
  };

  return (
    <div className="space-y-6">
      <OrdersMetrics />
      
      <OrdersHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        totalOrders={totalCount}
        selectedOrders={selectedOrders}
        onClearFilters={clearFilters}
        onExport={exportOrders}
        onBulkAction={handleBulkAction}
      />

      <OrdersTable
        orders={orders}
        isLoading={isLoading}
        selectedOrders={selectedOrders}
        onSelectOrder={handleSelectOrder}
        onSelectAll={handleSelectAll}
        onViewOrder={setSelectedOrderId}
        onUpdateStatus={updateOrderStatus}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onStatusUpdate={refetch}
      />
    </div>
  );
};