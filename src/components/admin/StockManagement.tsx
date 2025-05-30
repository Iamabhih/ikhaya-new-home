
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Plus, Minus, AlertTriangle } from "lucide-react";

export const StockManagement = () => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [movementType, setMovementType] = useState<"restock" | "adjustment">("restock");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, min_stock_level')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, quantityChange, type, notes }: {
      productId: string;
      quantityChange: number;
      type: string;
      notes: string;
    }) => {
      const { error } = await supabase.rpc('update_product_stock', {
        p_product_id: productId,
        p_quantity_change: quantityChange,
        p_movement_type: type,
        p_notes: notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stock updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setSelectedProduct("");
      setQuantity("");
      setNotes("");
    },
    onError: (error) => {
      console.error('Stock update error:', error);
      toast.error('Failed to update stock');
    },
  });

  const handleStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !quantity) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    const quantityChange = parseInt(quantity);
    if (isNaN(quantityChange)) {
      toast.error('Please enter a valid quantity');
      return;
    }

    updateStockMutation.mutate({
      productId: selectedProduct,
      quantityChange,
      type: movementType,
      notes
    });
  };

  const lowStockProducts = products.filter(p => 
    p.stock_quantity <= (p.min_stock_level || 5)
  );

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{product.name}</span>
                    {product.sku && <span className="text-sm text-muted-foreground ml-2">({product.sku})</span>}
                  </div>
                  <Badge variant="destructive">
                    {product.stock_quantity} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStockUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku && `(${product.sku})`} - Stock: {product.stock_quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="movementType">Movement Type</Label>
                <Select value={movementType} onValueChange={(value: "restock" | "adjustment") => setMovementType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity Change</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter positive or negative number"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this stock movement"
              />
            </div>

            <Button 
              type="submit" 
              disabled={updateStockMutation.isPending}
              className="w-full"
            >
              {updateStockMutation.isPending ? "Updating..." : "Update Stock"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Stock Movements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.products?.name}</div>
                        {movement.products?.sku && (
                          <div className="text-sm text-muted-foreground">{movement.products.sku}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={movement.movement_type === 'sale' ? 'destructive' : 'default'}>
                        {movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                      </span>
                    </TableCell>
                    <TableCell>{movement.previous_quantity}</TableCell>
                    <TableCell>{movement.new_quantity}</TableCell>
                    <TableCell>
                      {new Date(movement.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {movement.notes && (
                        <span className="text-sm text-muted-foreground">
                          {movement.notes}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
