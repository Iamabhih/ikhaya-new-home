import { cn } from "@/lib/utils";
import { 
  Clock, 
  Settings, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  RotateCcw
} from "lucide-react";

interface OrderProgressStepperProps {
  currentStatus: string;
  onStatusClick?: (status: string) => void;
  className?: string;
}

const ORDER_STATUSES = [
  { key: 'pending', label: 'Pending', icon: Clock, description: 'Order received' },
  { key: 'processing', label: 'Processing', icon: Settings, description: 'Preparing order' },
  { key: 'shipped', label: 'Shipped', icon: Truck, description: 'In transit' },
  { key: 'delivered', label: 'Delivered', icon: Package, description: 'At destination' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, description: 'Order complete' },
];

const TERMINAL_STATUSES = ['cancelled', 'returned'];

export const OrderProgressStepper = ({ 
  currentStatus, 
  onStatusClick,
  className 
}: OrderProgressStepperProps) => {
  const currentIndex = ORDER_STATUSES.findIndex(s => s.key === currentStatus);
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

  if (isTerminal) {
    return (
      <div className={cn("flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50", className)}>
        {currentStatus === 'cancelled' ? (
          <>
            <XCircle className="h-6 w-6 text-destructive" />
            <span className="font-medium text-destructive">Order Cancelled</span>
          </>
        ) : (
          <>
            <RotateCcw className="h-6 w-6 text-warning" />
            <span className="font-medium text-warning">Order Returned</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex items-center justify-between">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        
        {/* Progress Line Active */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
          style={{ 
            width: `${currentIndex >= 0 ? (currentIndex / (ORDER_STATUSES.length - 1)) * 100 : 0}%` 
          }}
        />

        {ORDER_STATUSES.map((status, index) => {
          const Icon = status.icon;
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isClickable = onStatusClick && (index === currentIndex + 1 || index === currentIndex);

          return (
            <div 
              key={status.key}
              className={cn(
                "relative flex flex-col items-center z-10 group",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStatusClick(status.key)}
            >
              {/* Step Circle */}
              <div 
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                  isPast && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && "bg-background border-muted-foreground/30 text-muted-foreground",
                  isClickable && !isCurrent && "hover:border-primary hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "mt-2 text-xs font-medium text-center transition-colors",
                  isPast && "text-primary",
                  isCurrent && "text-primary font-semibold",
                  isFuture && "text-muted-foreground"
                )}
              >
                {status.label}
              </span>

              {/* Tooltip on hover */}
              {isClickable && !isCurrent && (
                <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground whitespace-nowrap">
                  Click to advance
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
