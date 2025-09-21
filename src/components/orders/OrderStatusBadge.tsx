import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  AlertCircle 
} from "lucide-react";

interface OrderStatusBadgeProps {
  status: string;
  variant?: "default" | "outline";
  showIcon?: boolean;
}

export const OrderStatusBadge = ({ 
  status, 
  variant = "default", 
  showIcon = true 
}: OrderStatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      case 'returned': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "h-3 w-3";
    switch (status) {
      case 'pending': return <Clock className={iconClass} />;
      case 'processing': return <Package className={iconClass} />;
      case 'shipped': return <Truck className={iconClass} />;
      case 'delivered': return <CheckCircle className={iconClass} />;
      case 'completed': return <CheckCircle className={iconClass} />;
      case 'cancelled': return <XCircle className={iconClass} />;
      case 'returned': return <RotateCcw className={iconClass} />;
      default: return <AlertCircle className={iconClass} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'returned': return 'Returned';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Badge 
      variant={variant === "outline" ? "outline" : getStatusColor(status)} 
      className="flex items-center gap-1"
    >
      {showIcon && getStatusIcon(status)}
      {getStatusLabel(status)}
    </Badge>
  );
};