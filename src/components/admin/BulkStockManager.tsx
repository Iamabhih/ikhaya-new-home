import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  BarChart3
} from "lucide-react";

export const BulkStockManager = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [stockValue, setStockValue] = useState("100");
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [lastUpdateResult, setLastUpdateResult] = useState<{
    success: boolean;
    count: number;
    timestamp: Date;
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchProductCount = async () => {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setTotalProducts(count || 0);
    } catch (error: any) {
      console.error('Error fetching product count:', error);
      toast({
        title: "Error",
        description: "Failed to fetch product count",
        variant: "destructive",
      });
    }
  };

  const updateAllProductStock = async () => {
    const stockQuantity = parseInt(stockValue);
    
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      toast({
        title: "Invalid stock value",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to update ALL products to ${stockQuantity} stock items? This will affect ${totalProducts || 'all'} products.`
    );
    
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const { count, error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: stockQuantity,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all products

      if (error) throw error;

      // Invalidate all product-related queries
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['optimized-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-paginated-products'] });
      
      setLastUpdateResult({
        success: true,
        count: count || 0,
        timestamp: new Date()
      });

      toast({
        title: "Stock updated successfully",
        description: `Updated ${count || 0} products to ${stockQuantity} stock items`,
      });
      
      // Refresh product count
      await fetchProductCount();
    } catch (error: any) {
      console.error('Bulk stock update error:', error);
      setLastUpdateResult({
        success: false,
        count: 0,
        timestamp: new Date()
      });
      toast({
        title: "Stock update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch product count on component mount
  React.useEffect(() => {
    fetchProductCount();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Bulk Stock Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">
                    {totalProducts !== null ? totalProducts.toLocaleString() : '---'}
                  </p>
                </div>
              </div>
            </Card>
            
            {lastUpdateResult && (
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  {lastUpdateResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Last Update</p>
                    <p className="text-lg font-semibold">
                      {lastUpdateResult.success ? 'Success' : 'Failed'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lastUpdateResult.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Actions</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProductCount}
                    className="mt-1"
                  >
                    Refresh Count
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Warning */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              <strong>SuperAdmin Warning:</strong> This action will update the stock quantity for ALL products in the database. 
              This cannot be undone. Make sure you have a backup before proceeding.
            </AlertDescription>
          </Alert>

          {/* Stock Update Controls */}
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="stock-value">New Stock Quantity</Label>
                <Input
                  id="stock-value"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter stock quantity"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={updateAllProductStock}
                disabled={isUpdating || !stockValue}
                className="min-w-[200px]"
                size="lg"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating All Products...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Update All to {stockValue || 0} Stock
                  </>
                )}
              </Button>
            </div>

            {totalProducts && (
              <div className="text-sm text-muted-foreground">
                This will affect <Badge variant="outline">{totalProducts.toLocaleString()}</Badge> products
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Label>Quick Stock Values</Label>
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 250, 500, 1000].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => setStockValue(value.toString())}
                  disabled={isUpdating}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};