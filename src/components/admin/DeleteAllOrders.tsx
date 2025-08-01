import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DeleteAllOrders = () => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Get total order count
  const { data: orderCount = 0 } = useQuery({
    queryKey: ['total-order-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting bulk order deletion...');
      
      // Delete all order-related data in the correct order to avoid foreign key conflicts
      const deleteOperations = [
        // Delete fulfillment items first
        supabase.from('fulfillment_items').delete().neq('id', ''),
        // Delete fulfillments
        supabase.from('fulfillments').delete().neq('id', ''),
        // Delete order timeline entries
        supabase.from('order_timeline').delete().neq('id', ''),
        // Delete order notes
        supabase.from('order_notes').delete().neq('id', ''),
        // Delete order status history
        supabase.from('order_status_history').delete().neq('id', ''),
        // Delete payment transactions
        supabase.from('payment_transactions').delete().neq('id', ''),
        // Delete order items
        supabase.from('order_items').delete().neq('id', ''),
        // Delete return items (if any exist)
        supabase.from('return_items').delete().neq('id', ''),
        // Delete return requests (if any exist)
        supabase.from('return_requests').delete().neq('id', ''),
      ];

      // Execute all related deletions
      console.log('Deleting related order data...');
      const results = await Promise.allSettled(deleteOperations);
      
      // Log any failures but continue
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Failed to delete related order data ${index}:`, result.reason);
        }
      });

      // Finally, delete all orders
      console.log('Deleting all orders...');
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .neq('id', ''); // This will delete ALL orders
      
      if (ordersError) {
        console.error('Error deleting orders:', ordersError);
        throw ordersError;
      }

      console.log('Bulk order deletion completed');
    },
    onSuccess: () => {
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['total-order-count'] });
      queryClient.invalidateQueries({ queryKey: ['order-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      
      // Clear the confirmation text
      setConfirmationText("");
      
      // Show success message
      toast.success(`All orders and related data deleted successfully!`);
      
      // Force a page reload to ensure all cached data is cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete orders: ${error.message}`);
    },
  });

  const handleDeleteAll = async () => {
    if (confirmationText !== "DELETE ALL ORDERS") {
      toast.error("Please type 'DELETE ALL ORDERS' to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmationValid = confirmationText === "DELETE ALL ORDERS";

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone - Force Delete All Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Delete All Orders ({orderCount} total)</p>
          <p>This will permanently delete all {orderCount} orders and their related data including:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>All order items and product references</li>
            <li>All payment transactions and records</li>
            <li>All fulfillment and shipping data</li>
            <li>All order timeline and status history</li>
            <li>All order notes and communications</li>
            <li>All return requests and items</li>
          </ul>
          <p className="text-destructive font-medium mt-3">
            ⚠️ WARNING: This action cannot be undone and will remove ALL order history!
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmation">
            Type "DELETE ALL ORDERS" to confirm:
          </Label>
          <Input
            id="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="DELETE ALL ORDERS"
            className="font-mono"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={!isConfirmationValid || isDeleting || orderCount === 0}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : `Force Delete All ${orderCount} Orders`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Final Confirmation - Delete All Orders
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to permanently delete all {orderCount} orders and their complete related data.
                <br /><br />
                <strong>This action cannot be undone and will remove ALL order history from the system!</strong>
                <br /><br />
                This includes customer order history, payment records, fulfillment data, and all related analytics.
                <br /><br />
                Are you absolutely sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Delete All Orders
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};