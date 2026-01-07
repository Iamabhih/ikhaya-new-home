import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Keyboard } from "lucide-react";
import { OrderListItem, Order } from "./OrderListItem";

interface OrderListTableProps {
  orders: Order[];
  isLoading: boolean;
  selectedOrders: string[];
  keyboardSelectedIndex: number;
  isSuperAdmin: boolean;
  onSelectAll: (checked: boolean) => void;
  onOrderSelect: (id: string, checked: boolean) => void;
  onViewOrder: (order: Order) => void;
  onNotifyOrder: (orderId: string) => void;
  onKeyboardSelect: (index: number) => void;
  onShowKeyboardHelp: () => void;
  getFulfillmentIcon: (status: string) => React.ReactNode;
  onOrderUpdated: () => void;
  onOrderDeleted: () => void;
}

export const OrderListTable = ({
  orders,
  isLoading,
  selectedOrders,
  keyboardSelectedIndex,
  isSuperAdmin,
  onSelectAll,
  onOrderSelect,
  onViewOrder,
  onNotifyOrder,
  onKeyboardSelect,
  onShowKeyboardHelp,
  getFulfillmentIcon,
  onOrderUpdated,
  onOrderDeleted
}: OrderListTableProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Orders
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onShowKeyboardHelp}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedOrders.length === orders.length && orders.length > 0}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedOrders.length} of {orders.length || 0} selected
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
            {orders.map((order, index) => (
              <OrderListItem
                key={order.id}
                order={order}
                index={index}
                isSelected={selectedOrders.includes(order.id)}
                isKeyboardSelected={keyboardSelectedIndex === index}
                isSuperAdmin={isSuperAdmin}
                onSelect={onOrderSelect}
                onView={() => onViewOrder(order)}
                onNotify={() => onNotifyOrder(order.id)}
                onClick={() => onKeyboardSelect(index)}
                onDoubleClick={() => onViewOrder(order)}
                getFulfillmentIcon={getFulfillmentIcon}
                onOrderUpdated={onOrderUpdated}
                onOrderDeleted={onOrderDeleted}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
