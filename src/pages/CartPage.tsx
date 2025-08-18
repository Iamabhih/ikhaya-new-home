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
  const handleQuantityChange = (itemId: string, newQuantity: string | number) => {
    const quantity = Math.max(1, parseInt(newQuantity.toString()) || 1);
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
      
      {/* Hero Section - Mobile Optimized */}
      <section className="bg-brand-gradient py-8 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 hidden md:block">
          <div className="absolute top-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-4 md:mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="text-white/80 hover:text-white">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">Shopping Cart</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="text-center max-w-3xl mx-auto text-white">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-6">Your Cart</h1>
            <p className="text-base md:text-xl text-white/90 leading-relaxed px-4">
              Review your selected items and proceed to checkout when ready.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-8 -mt-4 md:-mt-8 relative z-10">

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              {items.map((item) => {
                if (!item?.product) {
                  console.warn('Cart item missing product data:', item);
                  return null;
                }

                const imageUrl = getProductImageUrl(item.product);
                
                return (
                  <div key={item.id} className="cart-item-mobile lg:cart-item-desktop bg-card border border-border/50 rounded-lg hover:shadow-md transition-shadow">
                    {/* Mobile Layout */}
                    <div className="flex flex-col sm:hidden gap-3 p-4">
                      <div className="flex gap-3">
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
                              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/products/${item.product.slug}`}
                            className="block hover:text-primary transition-colors"
                          >
                            <h3 className="font-semibold text-base leading-tight line-clamp-2">{item.product.name || 'Unnamed Product'}</h3>
                          </Link>
                          
                          {item.product.sku && (
                            <p className="text-xs text-muted-foreground mt-1">
                              SKU: {item.product.sku}
                            </p>
                          )}
                          <p className="text-base font-medium mt-2">
                            R{item.product.price ? Number(item.product.price).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-10 w-10 p-0"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="h-10 w-10 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {item.quantity > 1 && (
                            <span className="text-sm text-muted-foreground">
                              Total: R{(item.product.price * item.quantity).toFixed(2)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            title="Remove item"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center gap-4 p-4 lg:p-6">
                      <Link 
                        to={`/products/${item.product.slug}`}
                        className="h-20 w-20 lg:h-24 lg:w-24 bg-muted rounded-md flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
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
                        
                        {getProductDescription(item.product) && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 overflow-hidden hidden lg:block">
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
                            className="h-9 w-9"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity || 1}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-16 text-center h-9"
                            min="1"
                            max="99"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="h-9 w-9"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          title="Remove item"
                          className="text-destructive hover:text-destructive h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-4 lg:p-6 h-fit lg:sticky lg:top-4">
              <h2 className="text-lg lg:text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm lg:text-base">
                  <span>Subtotal</span>
                  <span>R{(total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm lg:text-base">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-base lg:text-lg">
                    <span>Total</span>
                    <span>R{(total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Link to="/checkout" className="w-full">
                <Button className="w-full h-11 lg:h-12 text-sm lg:text-base" disabled={!items || items.length === 0}>
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