
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface ProductListProps {
  onEditProduct: (productId: string) => void;
  onCreateProduct: () => void;
}

export const ProductList = ({ onEditProduct, onCreateProduct }: ProductListProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete product');
      console.error(error);
    },
  });

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.sku}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {product.categories?.name || 'No category'}
                </TableCell>
                <TableCell>
                  <div>
                    <div>R{product.price}</div>
                    {product.compare_at_price && (
                      <div className="text-sm text-muted-foreground line-through">
                        R{product.compare_at_price}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                    {product.stock_quantity} in stock
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {product.is_featured && (
                      <Badge variant="outline">Featured</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onEditProduct(product.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDelete(product.id)}
                      disabled={deleteProductMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found.</p>
        </div>
      )}
    </div>
  );
};
