
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export const LowStockAlert = () => {
  const { data: lowStockProducts = [], isLoading } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, min_stock_level')
        .eq('is_active', true)
        .or('stock_quantity.lte.min_stock_level,stock_quantity.eq.0')
        .order('stock_quantity', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (lowStockProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Inventory Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-green-600 font-medium">All products are well stocked!</div>
            <p className="text-sm text-muted-foreground mt-1">No products are running low on inventory.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Alert
            <Badge variant="destructive">{lowStockProducts.length}</Badge>
          </CardTitle>
          <Link to="/admin/products">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Inventory
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {lowStockProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{product.name}</div>
                {product.sku && (
                  <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                )}
              </div>
              <div className="text-right">
                <Badge 
                  variant={product.stock_quantity === 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {product.stock_quantity === 0 ? "Out of Stock" : `${product.stock_quantity} left`}
                </Badge>
                {product.min_stock_level && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Min: {product.min_stock_level}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
