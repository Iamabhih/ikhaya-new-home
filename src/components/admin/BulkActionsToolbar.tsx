
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, CheckCircle, XCircle, DollarSign, Download, Upload } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedProducts: string[];
  onClearSelection: () => void;
}

export const BulkActionsToolbar = ({ selectedProducts, onClearSelection }: BulkActionsToolbarProps) => {
  const queryClient = useQueryClient();
  const [bulkAction, setBulkAction] = useState<string>('');
  const [priceValue, setPriceValue] = useState<string>('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action, value }: { action: string; value?: string }) => {
      let updateData: any = {};
      
      switch (action) {
        case 'activate':
          updateData = { is_active: true };
          break;
        case 'deactivate':
          updateData = { is_active: false };
          break;
        case 'feature':
          updateData = { is_featured: true };
          break;
        case 'unfeature':
          updateData = { is_featured: false };
          break;
        case 'price':
          if (!value || isNaN(parseFloat(value))) {
            throw new Error('Invalid price value');
          }
          updateData = { price: parseFloat(value) };
          break;
        case 'delete':
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .in('id', selectedProducts);
          if (deleteError) throw deleteError;
          return;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .in('id', selectedProducts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClearSelection();
      setBulkAction('');
      setPriceValue('');
      toast.success(`Bulk action completed for ${selectedProducts.length} products`);
    },
    onError: (error) => {
      toast.error(`Failed to perform bulk action: ${error.message}`);
    },
  });

  const handleBulkAction = () => {
    if (!bulkAction) return;
    
    if (bulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
        return;
      }
    }

    if (bulkAction === 'price') {
      if (!priceValue) {
        toast.error('Please enter a price value');
        return;
      }
    }

    bulkUpdateMutation.mutate({
      action: bulkAction,
      value: priceValue || undefined,
    });
  };

  const exportProducts = () => {
    // This would implement CSV export functionality
    toast.info('Export functionality coming soon');
  };

  const importProducts = () => {
    // This would implement CSV import functionality
    toast.info('Import functionality coming soon');
  };

  if (selectedProducts.length === 0) return null;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-lg">
      <Badge variant="secondary">
        {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
      </Badge>

      <div className="flex items-center gap-2">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Choose action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activate">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Activate
              </div>
            </SelectItem>
            <SelectItem value="deactivate">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Deactivate
              </div>
            </SelectItem>
            <SelectItem value="feature">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Mark as Featured
              </div>
            </SelectItem>
            <SelectItem value="unfeature">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-500" />
                Remove from Featured
              </div>
            </SelectItem>
            <SelectItem value="price">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Update Price
              </div>
            </SelectItem>
            <SelectItem value="delete">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {bulkAction === 'price' && (
          <Input
            placeholder="New price (R)"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            className="w-32"
            type="number"
            step="0.01"
            min="0"
          />
        )}

        <Button
          onClick={handleBulkAction}
          disabled={!bulkAction || bulkUpdateMutation.isPending}
          variant={bulkAction === 'delete' ? 'destructive' : 'default'}
        >
          Apply
        </Button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={exportProducts}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={importProducts}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
};
