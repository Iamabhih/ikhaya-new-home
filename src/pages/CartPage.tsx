import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { useState } from "react";

const CartPage = () => {
  const { items, updateQuantity, removeItem, total, isLoading } = useCart();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Safe image URL getter for product_images table
  const getProductImageUrl = (product: any) => {
    if (!product) return null;
    
    // Check product_images array
    if (product.product_images && Array.isArray(product.product_images) && product.product_images.length > 0) {
      // Sort by sort_order if available, otherwise use first image
      const sortedImages = product.product_images.sort((a: any, b: any) => 
        (a.sort_order || 0) - (b.sort_order || 0)
      );
      return sortedImages[0]?.image_url || null;
    }
    
    return null;
  };

export default CartPage;

  // Get product description - try both fields
  const getProductDescription = (product: any) => {
    if (!product) return null;
    // Try short_description first, then description, and truncate if too long
    const desc = (product as any).short_description || (product as any).description;
    if (!desc) return null;
    // Truncate to ~150 characters for cart display
    return desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
  };

  // Handle image load errors
  const handleImageError = (itemId: string) => {
    setFailedImages(prev => new Set([...prev, itemId]));
  };

  // Safe quantity update handler
  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    updateQuantity({ itemId, quantity });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Shopping Cart</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        {/* DEBUG INFO - Remove in production */}
        {process.env.NODE_ENV === 'development' && items.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
            <h3 className="font-bold mb-2">Debug Info (development only):</h3>
            <p className="text-sm">First product keys: {Object.keys(items[0]?.product || {}).join(', ')}</p>
            {items[0]?.product && (
              <>
                <p className="text-sm mt-1">Short description: "{items[0].product.short_description || 'NULL/EMPTY'}"</p>
                <p className="text-sm mt-1">Description: "{(items[0].product as any).description || 'NULL/EMPTY'}"</p>
                <p className="text-sm mt-1">Using description: "{getProductDescription(items[0].product) || 'NONE'}"</p>
              </>
            )}
          </div>
        )}



        {!items || items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Start shopping to add items to your cart</p>
            <Link to="/products">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                if (!item?.product) {
                  console.warn('Cart item missing product data:', item);
                  return null;
                }

                const imageUrl = getProductImageUrl(item.product);
                
                return (
                  <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Link 
                      to={`/products/${item.product.slug}`}
                      className="h-20 w-20 bg-muted rounded-md flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      {imageUrl && !failedImages.has(item.id) ? (
                        <img 
                          src={imageUrl} 
                          alt={item.product.name || 'Product'}
                          className="h-full w-full object-cover"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/products/${item.product.slug}`}
                        className="block hover:text-primary transition-colors"
                      >
                        <h3 className="font-semibold text-lg leading-tight">{item.product.name || 'Unnamed Product'}</h3>
                      </Link>
                      
                      {/* Show description from either field */}
                      {getProductDescription(item.product) && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3 overflow-hidden">
                          {getProductDescription(item.product)}
                        </p>
                      )}
                      
                      {item.product.sku && (
                        <p className="text-xs text-muted-foreground mt-1">
                          SKU: {item.product.sku}
                        </p>
                      )}
                      <p className="text-lg font-medium mt-2">
                        R{item.product.price ? Number(item.product.price).toFixed(2) : '0.00'}
                        {item.quantity > 1 && (
                          <span className="text-sm text-muted-foreground font-normal">
                            {' '}× {item.quantity} = R{(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-16 text-center"
                          min="1"
                          max="99"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>

            <div className="bg-muted/30 p-6 rounded-lg h-fit">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R{(total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>R{(total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Link to="/checkout" className="w-full">
                <Button className="w-full" disabled={!items || items.length === 0}>
                  Proceed to Checkout
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;