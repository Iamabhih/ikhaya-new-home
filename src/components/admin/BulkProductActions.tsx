
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

interface BulkProductActionsProps {
  selectedProducts: string[];
  onClearSelection: () => void;
}

export const BulkProductActions = ({ selectedProducts, onClearSelection }: BulkProductActionsProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleBulkUpdate = async (field: string, value: any) => {
    if (selectedProducts.length === 0) return;
    
    setIsUpdating(true);
    try {
      const updates: any = {};
      updates[field] = value;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('products')
        .update(updates)
        .in('id', selectedProducts);

      if (error) throw error;

      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ['optimized-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      await queryClient.invalidateQueries({ queryKey: ['featured-products-optimized'] });
      
      toast({
        title: "Bulk update successful",
        description: `Updated ${selectedProducts.length} products`,
      });
      
      onClearSelection();
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast({
        title: "Bulk update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshMaterializedViews = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.rpc('refresh_category_counts');
      
      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['categories-optimized'] });
      await queryClient.invalidateQueries({ queryKey: ['categories-optimized-home'] });
      
      toast({
        title: "Views refreshed",
        description: "Category product counts have been updated",
      });
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (selectedProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Bulk Operations
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMaterializedViews}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Views
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select products to perform bulk operations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Bulk Operations ({selectedProducts.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (confirm(`Update all ${selectedProducts.length} products to 100 stock?`)) {
                  handleBulkUpdate('stock_quantity', 100);
                }
              }}
              disabled={isUpdating}
              variant="default"
              className="flex-1"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Set All to 100 Stock
            </Button>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-price">Update Price</Label>
            <div className="flex gap-2">
              <Input
                id="bulk-price"
                type="number"
                step="0.01"
                placeholder="New price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
              <Button
                onClick={() => handleBulkUpdate('price', parseFloat(bulkPrice))}
                disabled={!bulkPrice || isUpdating}
                size="sm"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-status">Update Status</Label>
            <div className="flex gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleBulkUpdate('is_active', bulkStatus === 'true')}
                disabled={!bulkStatus || isUpdating}
                size="sm"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quick Actions</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleBulkUpdate('is_featured', true)}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                Feature All
              </Button>
              <Button
                onClick={() => handleBulkUpdate('stock_quantity', 100)}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                Set Stock to 100
              </Button>
              <Button
                onClick={onClearSelection}
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};
