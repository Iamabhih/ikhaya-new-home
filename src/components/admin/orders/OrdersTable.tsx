import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Truck, Package, Mail } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
};

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  selectedOrders: string[];
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onViewOrder: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export const OrdersTable = ({
  orders,
  isLoading,
  selectedOrders,
  onSelectOrder,
  onSelectAll,
  onViewOrder,
  onUpdateStatus
}: OrdersTableProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Unfulfilled';
      case 'delivered': return 'Fulfilled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No orders found</h3>
        <p className="text-muted-foreground">
          No orders match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedOrders.length === orders.length}
                onCheckedChange={onSelectAll}
                aria-label="Select all orders"
              />
            </TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Fulfillment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30">
              <TableCell>
                <Checkbox
                  checked={selectedOrders.includes(order.id)}
                  onCheckedChange={(checked) => onSelectOrder(order.id, !!checked)}
                  aria-label={`Select order ${order.order_number}`}
                />
              </TableCell>
              
              <TableCell onClick={() => onViewOrder(order.id)}>
                <div className="space-y-1">
                  <div className="font-medium">#{order.order_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {order.order_items?.length || 0} items
                  </div>
                </div>
              </TableCell>
              
              <TableCell onClick={() => onViewOrder(order.id)}>
                <div className="space-y-1">
                  <div className="text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </TableCell>
              
              <TableCell onClick={() => onViewOrder(order.id)}>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {order.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {order.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell onClick={() => onViewOrder(order.id)}>
                <Badge variant="outline" className="text-xs">
                  Paid
                </Badge>
              </TableCell>
              
              <TableCell onClick={() => onViewOrder(order.id)}>
                <Badge 
                  className={`text-xs font-medium ${getStatusColor(order.status)}`}
                  variant="outline"
                >
                  {formatStatus(order.status)}
                </Badge>
              </TableCell>
              
              <TableCell className="text-right font-medium" onClick={() => onViewOrder(order.id)}>
                R{order.total_amount.toFixed(2)}
              </TableCell>
              
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewOrder(order.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'shipped')}>
                      <Truck className="h-4 w-4 mr-2" />
                      Mark as shipped
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'delivered')}>
                      <Package className="h-4 w-4 mr-2" />
                      Mark as fulfilled
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      Email customer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};