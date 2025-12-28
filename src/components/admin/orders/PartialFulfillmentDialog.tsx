import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";

interface PartialFulfillmentDialogProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

interface FulfillmentItem {
  itemId: string;
  productName: string;
  totalQty: number;
  fulfillQty: number;
  selected: boolean;
}

export const PartialFulfillmentDialog = ({ order, isOpen, onClose }: PartialFulfillmentDialogProps) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCompany, setTrackingCompany] = useState("");
  const [items, setItems] = useState<FulfillmentItem[]>(
    order.order_items?.map((item: any) => ({
      itemId: item.id,
      productName: item.product_name,
      totalQty: item.quantity,
      fulfillQty: item.quantity,
      selected: true,
    })) || []
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFulfillmentMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = items.filter(i => i.selected && i.fulfillQty > 0);
      if (selectedItems.length === 0) {
        throw new Error("Please select at least one item to fulfill");
      }

      // Generate fulfillment number
      const fulfillmentNumber = `FUL-${order.order_number}-${Date.now()}`;

      // Create fulfillment record
      const { data: fulfillment, error: fulfillmentError } = await supabase
        .from('fulfillments')
        .insert({
          order_id: order.id,
          fulfillment_number: fulfillmentNumber,
          tracking_number: trackingNumber || null,
          tracking_company: trackingCompany || null,
          status: 'fulfilled',
        })
        .select()
        .single();

      if (fulfillmentError) throw fulfillmentError;

      // Create fulfillment items
      const fulfillmentItems = selectedItems.map(item => ({
        fulfillment_id: fulfillment.id,
        order_item_id: item.itemId,
        quantity: item.fulfillQty,
      }));

      const { error: itemsError } = await supabase
        .from('fulfillment_items')
        .insert(fulfillmentItems);

      if (itemsError) throw itemsError;

      // Check if all items are fulfilled
      const allItemsFulfilled = items.every(i => i.selected && i.fulfillQty === i.totalQty);
      const newFulfillmentStatus = allItemsFulfilled ? 'fulfilled' : 'partially_fulfilled';

      // Update order fulfillment status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ fulfillment_status: newFulfillmentStatus })
        .eq('id', order.id);

      if (orderError) throw orderError;

      return fulfillment;
    },
    onSuccess: () => {
      toast({ title: "Fulfillment created successfully" });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create fulfillment",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleItemToggle = (index: number, selected: boolean) => {
    const newItems = [...items];
    newItems[index].selected = selected;
    setItems(newItems);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].fulfillQty = Math.min(Math.max(0, qty), newItems[index].totalQty);
    setItems(newItems);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Fulfillment - #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tracking Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tracking Number</label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Carrier</label>
              <Input
                value={trackingCompany}
                onChange={(e) => setTrackingCompany(e.target.value)}
                placeholder="e.g., DHL, FedEx"
              />
            </div>
          </div>

          {/* Items to fulfill */}
          <div>
            <label className="text-sm font-medium mb-2 block">Items to Fulfill</label>
            <div className="border rounded-lg divide-y">
              {items.map((item, index) => (
                <div key={item.itemId} className="p-3 flex items-center gap-3">
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={(checked) => handleItemToggle(index, !!checked)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Total ordered: {item.totalQty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Qty:</span>
                    <Input
                      type="number"
                      min={0}
                      max={item.totalQty}
                      value={item.fulfillQty}
                      onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center"
                      disabled={!item.selected}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => createFulfillmentMutation.mutate()}
            disabled={createFulfillmentMutation.isPending}
          >
            {createFulfillmentMutation.isPending ? "Creating..." : "Create Fulfillment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
