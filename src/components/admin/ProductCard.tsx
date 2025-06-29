
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  categories?: { name: string };
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: string, checked: boolean) => void;
  onEdit: (productId: string) => void;
}

export const ProductCard = ({ product, isSelected, onSelect, onEdit }: ProductCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium truncate pr-2">{product.name}</h3>
              <div className="flex gap-1">
                {product.is_featured && (
                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                )}
                <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-1 text-sm text-muted-foreground mb-3 ml-8">
          <p>SKU: {product.sku || "N/A"}</p>
          <p>Price: R{product.price.toFixed(2)}</p>
          <p>Stock: {product.stock_quantity}</p>
          {product.categories?.name && (
            <p>Category: {product.categories.name}</p>
          )}
        </div>

        <div className="flex gap-2 ml-8">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(product.id)}
            className="flex-1"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="ghost">
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
