
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { toast } from "sonner";

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleAddToCart = () => {
    if (product) {
      addToCart({ productId: product.id });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Product not found</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            {product.categories && (
              <BreadcrumbItem>
                <BreadcrumbLink href={`/category/${product.categories.slug}`}>
                  {product.categories.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              {primaryImage ? (
                <img
                  src={primaryImage.image_url}
                  alt={primaryImage.alt_text || product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-muted-foreground">No image available</span>
              )}
            </div>
            
            {product.product_images && product.product_images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.product_images.map((image, index) => (
                  <div key={index} className="aspect-square bg-muted rounded border">
                    <img
                      src={image.image_url}
                      alt={image.alt_text || `${product.name} ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.categories && (
                <Badge variant="secondary">{product.categories.name}</Badge>
              )}
            </div>

            <div className="text-3xl font-bold text-primary">
              R{product.price}
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-lg text-muted-foreground line-through ml-2">
                  R{product.compare_at_price}
                </span>
              )}
            </div>

            {product.short_description && (
              <p className="text-lg text-muted-foreground">{product.short_description}</p>
            )}

            <div className="space-y-4">
              <Button onClick={handleAddToCart} size="lg" className="w-full">
                Add to Cart
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Add to Wishlist
                </Button>
                <Button variant="outline" className="flex-1">
                  Share
                </Button>
              </div>
            </div>

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {product.sku && (
              <div>
                <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
