import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, Send } from "lucide-react";
import { OrderStatusBadge } from "../../../orders/OrderStatusBadge";
import { OrderRiskBadge } from "../OrderRiskBadge";
import { SuperAdminOrderActions } from "../SuperAdminOrderActions";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  status: string;
  fulfillment_status: string;
  priority: string;
  total_amount: number;
  created_at: string;
  tags: string[];
  email: string;
}

interface OrderListItemProps {
  order: Order;
  index: number;
  isSelected: boolean;
  isKeyboardSelected: boolean;
  isSuperAdmin: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onView: () => void;
  onNotify: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  getFulfillmentIcon: (status: string) => React.ReactNode;
  onOrderUpdated: () => void;
  onOrderDeleted: () => void;
}

export const OrderListItem = ({
  order,
  index,
  isSelected,
  isKeyboardSelected,
  isSuperAdmin,
  onSelect,
  onView,
  onNotify,
  onClick,
  onDoubleClick,
  getFulfillmentIcon,
  onOrderUpdated,
  onOrderDeleted
}: OrderListItemProps) => {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        isKeyboardSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(order.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{order.order_number}</span>
              <OrderStatusBadge status={order.status} />
              <OrderRiskBadge order={order} />
              <div className="flex items-center gap-1">
                {getFulfillmentIcon(order.fulfillment_status)}
                <span className="text-sm text-muted-foreground">
                  {order.fulfillment_status}
                </span>
              </div>
              {order.priority === 'urgent' && (
                <Badge variant="destructive">Urgent</Badge>
              )}
              {order.tags && order.tags.length > 0 && (
                <div className="flex gap-1">
                  {order.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {order.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{order.tags.length - 2}
                    </Badge>
                  )}
                </div>
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
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNotify();
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Notify
          </Button>

          {isSuperAdmin && (
            <SuperAdminOrderActions
              order={order}
              onOrderUpdated={onOrderUpdated}
              onOrderDeleted={onOrderDeleted}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export type { Order };
