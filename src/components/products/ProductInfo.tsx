
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Minus, Plus } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface Product {
  id: string;
  name: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity?: number;
  sku?: string;
  categories?: {
    name: string;
    slug: string;
  };
}

interface ProductInfoProps {
  product: Product;
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const isInStock = (product.stock_quantity || 0) > 0;
  const maxQuantity = Math.min(product.stock_quantity || 1, 10);

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      await addToCart({ productId: product.id, quantity });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, maxQuantity));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Category */}
      {product.categories && (
        <Badge variant="secondary">{product.categories.name}</Badge>
      )}

      {/* Product Name */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
        {product.sku && (
          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-foreground">
          R{product.price.toFixed(2)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-xl text-muted-foreground line-through">
              R{product.compare_at_price?.toFixed(2)}
            </span>
            <Badge variant="destructive">
              {discountPercentage}% OFF
            </Badge>
          </>
        )}
      </div>

      {/* Short Description */}
      {product.short_description && (
        <p className="text-lg text-muted-foreground leading-relaxed">
          {product.short_description}
        </p>
      )}

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <Badge variant={isInStock ? "default" : "destructive"}>
          {isInStock ? `${product.stock_quantity} in stock` : 'Out of stock'}
        </Badge>
      </div>

      {/* Quantity Selector */}
      {isInStock && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity:</span>
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="h-10 w-10 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex items-center justify-center h-10 w-12 text-sm font-medium">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementQuantity}
                disabled={quantity >= maxQuantity}
                className="h-10 w-10 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart & Wishlist */}
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              disabled={!isInStock || isAddingToCart}
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {isAddingToCart ? 'Adding...' : 'Add to Cart'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-4"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Full Description */}
      {product.description && (
        <div className="space-y-3 pt-6 border-t">
          <h3 className="text-lg font-semibold">Description</h3>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>{product.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
