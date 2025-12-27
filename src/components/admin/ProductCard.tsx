
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Edit, Eye, Image } from "lucide-react";
import { ProductImageManager } from "./ProductImageManager";

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
  const [showImageManager, setShowImageManager] = useState(false);
  const stockQuantity = product.stock_quantity || 0;
  const stockStatus = stockQuantity > 10 ? 'high' : stockQuantity > 0 ? 'low' : 'out';
  
  return (
    <Card className="group bg-white border border-gray-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
            className="mt-1 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
          />
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header with title and badges */}
            <div className="flex justify-between items-start gap-3">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                {product.name}
              </h3>
              <div className="flex gap-1.5 flex-shrink-0">
                {product.is_featured && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Featured
                  </Badge>
                )}
                <Badge 
                  variant={product.is_active ? "default" : "secondary"} 
                  className={`text-xs ${
                    product.is_active 
                      ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
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
                  <span className="text-gray-500 text-xs uppercase tracking-wide">SKU</span>
                  <p className="font-medium text-gray-900">{product.sku || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Price</span>
                  <p className="font-semibold text-gray-900">R{product.price.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Stock</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{stockQuantity}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      stockStatus === 'high' ? 'bg-green-400' : 
                      stockStatus === 'low' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                  </div>
                </div>
                {product.categories?.name && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Category</span>
                    <p className="font-medium text-gray-900 truncate">{product.categories.name}</p>
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
                className="flex-1 border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              
              <Sheet open={showImageManager} onOpenChange={setShowImageManager}>
                <SheetTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
                  <ProductImageManager productId={product.id} />
                </SheetContent>
              </Sheet>
              
              <Button 
                size="sm" 
                variant="ghost" 
                className="px-3 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
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
