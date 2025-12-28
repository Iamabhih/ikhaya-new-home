import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowRight, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Send,
  Printer,
  MessageSquare,
  Clock,
  Settings,
  Zap
} from "lucide-react";

interface OrderQuickActionsProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    fulfillment_status: string;
    email: string;
  };
  onStatusUpdate: (status: string, notes?: string) => void;
  onSendNotification: (type: string) => void;
  isUpdating?: boolean;
}

const STATUS_FLOW = {
  pending: { next: 'processing', label: 'Start Processing', icon: Settings },
  processing: { next: 'shipped', label: 'Mark as Shipped', icon: Truck },
  shipped: { next: 'delivered', label: 'Mark as Delivered', icon: Package },
  delivered: { next: 'completed', label: 'Complete Order', icon: CheckCircle },
  completed: null,
  cancelled: null,
  returned: null,
};

export const OrderQuickActions = ({ 
  order, 
  onStatusUpdate, 
  onSendNotification,
  isUpdating = false 
}: OrderQuickActionsProps) => {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'cancel';
    status?: string;
    label?: string;
  } | null>(null);

  const currentFlow = STATUS_FLOW[order.status as keyof typeof STATUS_FLOW];
  const NextIcon = currentFlow?.icon || ArrowRight;

  const handleQuickAdvance = () => {
    if (currentFlow?.next) {
      setConfirmAction({ 
        type: 'status', 
        status: currentFlow.next, 
        label: currentFlow.label 
      });
    }
  };

  const handleCancel = () => {
    setConfirmAction({ type: 'cancel', status: 'cancelled', label: 'Cancel Order' });
  };

  const confirmActionHandler = () => {
    if (confirmAction?.status) {
      onStatusUpdate(confirmAction.status);
    }
    setConfirmAction(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'shipped': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Actions
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Action - Advance Status */}
          {currentFlow?.next && (
            <Button 
              className="w-full justify-between group"
              size="lg"
              onClick={handleQuickAdvance}
              disabled={isUpdating}
            >
              <div className="flex items-center gap-2">
                <NextIcon className="h-4 w-4" />
                {currentFlow.label}
              </div>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}

          {order.status === 'completed' && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Order completed successfully</span>
            </div>
          )}

          <Separator />

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSendNotification('status_update')}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send status update email to customer</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.print()}
                  className="w-full"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print packing slip</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => onSendNotification('shipping_update')}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send tracking information</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Note
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add internal note (Ctrl+N)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Cancel Action */}
          {!['completed', 'cancelled', 'returned'].includes(order.status) && (
            <>
              <Separator />
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleCancel}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Order
              </Button>
            </>
          )}

          {/* Keyboard Shortcuts Hint */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> for keyboard shortcuts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'cancel' ? 'Cancel Order?' : 'Update Order Status?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'cancel' 
                ? `Are you sure you want to cancel order ${order.order_number}? This action cannot be undone.`
                : `Change order ${order.order_number} status to "${confirmAction?.status}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmActionHandler}
              className={confirmAction?.type === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmAction?.label || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};
