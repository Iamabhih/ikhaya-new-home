
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  stock_quantity?: number | null;
  is_active: boolean;
  is_featured: boolean;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
  created_at?: string;
  description?: string | null;
  short_description?: string | null;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: string, checked: boolean) => void;
  onEdit: (productId: string) => void;
}

export const ProductCard = ({ product, isSelected, onSelect, onEdit }: ProductCardProps) => {
  const stockQuantity = product.stock_quantity || 0;
  const stockStatus = stockQuantity > 10 ? 'high' : stockQuantity > 0 ? 'low' : 'out';
  
  return (
    <Card className="group glass-card hover-glow border-0 shadow-soft hover:shadow-premium transition-all duration-500 ease-out">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
            className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header with title and badges */}
            <div className="flex justify-between items-start gap-3">
              <h3 className="font-semibold text-premium truncate group-hover:text-primary transition-colors duration-300">
                {product.name}
              </h3>
              <div className="flex gap-1.5 flex-shrink-0">
                {product.is_featured && (
                  <Badge className="text-xs bg-accent/20 text-accent border-accent/30 hover:bg-accent/30 backdrop-blur-sm">
                    Featured
                  </Badge>
                )}
                <Badge 
                  variant={product.is_active ? "default" : "secondary"} 
                  className={`text-xs backdrop-blur-sm ${
                    product.is_active 
                      ? 'bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30' 
                      : 'bg-muted/50 text-muted-foreground border-muted/30'
                  }`}
                >
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            
            {/* Product details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-premium/60 text-xs uppercase tracking-wide font-medium">SKU</span>
                  <p className="font-semibold text-premium">{product.sku || "—"}</p>
                </div>
                <div>
                  <span className="text-premium/60 text-xs uppercase tracking-wide font-medium">Price</span>
                  <p className="font-bold text-primary text-lg">R{product.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-premium/60 text-xs uppercase tracking-wide font-medium">Stock</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-premium">{stockQuantity}</span>
                    <div className={`w-3 h-3 rounded-full shadow-soft ${
                      stockStatus === 'high' ? 'bg-green-400' : 
                      stockStatus === 'low' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                  </div>
                </div>
                {product.categories?.name && (
                  <div>
                    <span className="text-premium/60 text-xs uppercase tracking-wide font-medium">Category</span>
                    <p className="font-semibold text-premium truncate">{product.categories.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onEdit(product.id)}
                className="flex-1 glass hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 font-semibold"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="px-3 glass hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
