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
  brand_id?: string;
  categories?: { name: string };
  brands?: { name: string };
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <DialogHeader>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <DialogTitle className="text-xl font-semibold leading-tight">{product.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">SKU: {product.sku || "N/A"}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {product.is_featured && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                Featured
              </Badge>
            )}
            <Badge 
              variant={product.is_active ? "default" : "secondary"}
              className={product.is_active 
                ? "bg-slate-900 text-white hover:bg-slate-800" 
                : "bg-muted text-muted-foreground"
              }
            >
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </DialogHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-4 bg-background border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-foreground">{formatCurrency(product.price)}</div>
          <div className="text-sm text-muted-foreground mt-1">Price</div>
        </div>
        <div className="text-center p-4 bg-background border rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-foreground">{product.stock_quantity}</div>
          <div className="text-sm text-muted-foreground mt-1">Stock</div>
        </div>
        <div className="text-center p-4 bg-background border rounded-lg shadow-sm">
          <div className="mb-2">
            <Badge 
              variant={stockStatus.variant} 
              className={`text-xs ${
                stockStatus.variant === 'destructive' ? 'bg-red-100 text-red-800 border-red-200' :
                stockStatus.variant === 'secondary' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}
            >
              {stockStatus.label}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">Status</div>
        </div>
        <div className="text-center p-4 bg-background border rounded-lg shadow-sm">
          <div className="text-sm font-medium text-foreground">{product.categories?.name || "Uncategorized"}</div>
          <div className="text-sm text-muted-foreground mt-1">Category</div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Button 
          onClick={onEdit} 
          className="bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
        
        <Sheet open={showImageManager} onOpenChange={setShowImageManager}>
          <SheetTrigger asChild>
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
              <Image className="h-4 w-4 mr-2" />
              Manage Images
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-96">
            <ProductImageManager productId={product.id} />
          </SheetContent>
        </Sheet>
        
        <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </Button>
        
        <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
          <Tag className="h-4 w-4 mr-2" />
          Manage Tags
        </Button>
        
        <Button 
          variant="outline" 
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>
    </div>
  );
};