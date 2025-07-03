import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Edit, Package, Clock, Tag, Archive, Copy, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProductImageManager } from "./ProductImageManager";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id: string;
  categories?: { name: string };
  created_at: string;
  description?: string;
  short_description?: string;
}

interface ProductDetailViewProps {
  product: Product;
  onEdit: () => void;
  onClose: () => void;
}

export const ProductDetailView = ({ product, onEdit, onClose }: ProductDetailViewProps) => {
  const [showImageManager, setShowImageManager] = useState(false);
  
  const formatCurrency = (amount: number) => `R${amount.toFixed(2)}`;
  
  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= 5) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const stockStatus = getStockStatus(product.stock_quantity);

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">SKU: {product.sku || "N/A"}</p>
          </div>
          <div className="flex gap-1">
            {product.is_featured && (
              <Badge variant="secondary">Featured</Badge>
            )}
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </DialogHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</div>
          <div className="text-sm text-muted-foreground">Price</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{product.stock_quantity}</div>
          <div className="text-sm text-muted-foreground">Stock</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <Badge variant={stockStatus.variant} className="text-xs">
            {stockStatus.label}
          </Badge>
          <div className="text-sm text-muted-foreground mt-1">Status</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">{product.categories?.name || "N/A"}</div>
          <div className="text-sm text-muted-foreground">Category</div>
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Product Information
        </h3>
        
        <div className="grid gap-3">
          {product.short_description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Short Description</label>
              <p className="text-sm mt-1">{product.short_description}</p>
            </div>
          )}
          
          {product.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(product.created_at), { addSuffix: true })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Product ID</label>
              <p className="text-sm mt-1 font-mono">{product.id}</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onEdit} className="flex-1">
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
        
        <Sheet open={showImageManager} onOpenChange={setShowImageManager}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Image className="h-4 w-4 mr-2" />
              Manage Images
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-96">
            <ProductImageManager productId={product.id} />
          </SheetContent>
        </Sheet>
        
        <Button variant="outline" className="flex-1">
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </Button>
        <Button variant="outline" className="flex-1">
          <Tag className="h-4 w-4 mr-2" />
          Manage Tags
        </Button>
        <Button variant="outline" className="flex-1 text-destructive hover:text-destructive/90">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>
    </div>
  );
};