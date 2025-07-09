import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Trash2, ShoppingBag, ShoppingCart, Heart, ArrowRight, Package } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";

const CartPage = () => {
  const { items, updateQuantity, removeItem, total, isLoading } = useCart();

  // Helper function to get product image
  const getProductImage = (product) => {
    // Check for product_images array
    if (product.product_images && product.product_images.length > 0) {
      // Find primary image first
      const primaryImage = product.product_images.find(img => img.is_primary);
      if (primaryImage && primaryImage.image_url) {
        return primaryImage.image_url;
      }
      // If no primary, use first image
      const firstImage = product.product_images[0];
      if (firstImage && firstImage.image_url) {
        return firstImage.image_url;
      }
    }
    
    // Check for direct image_url on product
    if (product.image_url) {
      return product.image_url;
    }
    
    // Check for images array (alternative structure)
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-secondary/30 to-background py-16">
          <div className="container mx-auto px-4">
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
            
            <div className="text-center">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent mb-6">
                Shopping Cart
              </h1>
            </div>
          </div>
        </section>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Loading Items */}
            <div className="lg:col-span-2 space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-0 bg-white/50 backdrop-blur-sm shadow-lg animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 bg-gradient-to-br from-secondary/20 to-secondary/40 rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-secondary/30 rounded animate-pulse" />
                        <div className="h-4 bg-secondary/20 rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-secondary/30 rounded animate-pulse" />
                        <div className="h-10 w-16 bg-secondary/30 rounded animate-pulse" />
                        <div className="h-10 w-10 bg-secondary/30 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Loading Summary */}
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg h-fit animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-6 bg-secondary/30 rounded animate-pulse" />
                <div className="space-y-3">
                  <div className="h-4 bg-secondary/20 rounded animate-pulse" />
                  <div className="h-4 bg-secondary/20 rounded animate-pulse" />
                  <div className="h-5 bg-secondary/30 rounded animate-pulse" />
                </div>
                <div className="h-12 bg-secondary/30 rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-16">
        <div className="container mx-auto px-4">
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
          
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-6 py-3 mb-6 shadow-lg">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {items.length} {items.length === 1 ? 'Item' : 'Items'} in Cart
              </span>
            </div>
            
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent mb-6">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Review your selected items and proceed to checkout when you're ready
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg max-w-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-6 flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-primary/60" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Looks like you haven't added any items to your cart yet. Start shopping to discover amazing products for your home!
              </p>
              <div className="space-y-4">
                <Link to="/products">
                  <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                    <ShoppingBag className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Start Shopping
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button variant="outline" className="w-full bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-white/90">
                    Browse Categories
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Package className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold">Cart Items</h2>
                    <span className="text-sm text-muted-foreground">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  </div>
                  
                  <div className="space-y-4">
                    {items.map((item, index) => {
                      const imageUrl = getProductImage(item.product);
                      
                      return (
                        <Card 
                          key={item.id} 
                          className="border-0 bg-white/30 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                              {/* Product Image */}
                              <div className="h-24 w-24 rounded-lg flex-shrink-0 overflow-hidden shadow-md bg-gray-100">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      // If image fails to load, show placeholder
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="h-full w-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/40"
                                  style={{ display: imageUrl ? 'none' : 'flex' }}
                                >
                                  <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                              </div>
                              
                              {/* Product Details */}
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                                  {item.product.name}
                                </h3>
                                <p className="text-primary font-bold text-lg">
                                  R{item.product.price?.toFixed(2)}
                                </p>
                                {item.product.description && (
                                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                                    {item.product.description}
                                  </p>
                                )}
                              </div>
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                  onClick={() => updateQuantity({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity({ itemId: item.id, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-20 text-center bg-white/70 backdrop-blur-sm border-primary/20 focus:ring-2 focus:ring-primary/20"
                                  min="1"
                                />
                                
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                                  onClick={() => updateQuantity({ itemId: item.id, quantity: item.quantity + 1 })}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {/* Remove Button */}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 bg-white/70 backdrop-blur-sm border-red-200 hover:bg-red-500 hover:text-white transition-all duration-200"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Item Total */}
                            <div className="flex justify-end mt-4 pt-4 border-t border-white/30">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Item Total</p>
                                <p className="text-lg font-bold text-primary">
                                  R{(item.product.price * item.quantity).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Continue Shopping */}
              <Card className="border-0 bg-white/30 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 text-center">
                  <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Need More Items?</h3>
                  <p className="text-muted-foreground mb-4">Continue browsing our amazing collection</p>
                  <Link to="/products">
                    <Button variant="outline" className="bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg h-fit">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Order Summary</h2>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-medium">R{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  
                  <div className="border-t border-white/50 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">R{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Link to="/checkout" className="w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group h-12">
                      <ShoppingCart className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    <p>🔒 Secure checkout • Free shipping • Easy returns</p>
                  </div>
                </div>
                
                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-white/50">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">We Accept</p>
                    <div className="flex justify-center gap-2 text-2xl">
                      💳 🏦 💰
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CartPage;