
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { ProductCard } from "@/components/products/ProductCard";
import { OptimizedProductGrid } from "@/components/products/OptimizedProductGrid";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { ResponsiveGrid } from "@/components/ui/responsive-layout";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useEffect } from "react";

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteSettings();
  const { trackProductView, trackEvent } = useAnalytics();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Product slug is required');
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(id, image_url, alt_text, is_primary, sort_order)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      console.log('Product data:', data);
      console.log('Product images:', data?.product_images);
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category_id, settings?.hide_products_without_images],
    queryFn: async () => {
      if (!product?.category_id) return [];
      
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `)
        .eq('category_id', product.category_id)
        .eq('is_active', true)
        .neq('id', product.id);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        query = query.not('product_images', 'is', null);
      }

      const { data, error } = await query.limit(4);
      
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  // Track product view analytics
  useEffect(() => {
    if (product?.id) {
      trackProductView(product.id, product.category_id);
      
      // Track time spent on page
      const startTime = Date.now();
      
      return () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        trackEvent({
          event_type: 'engagement',
          event_name: 'product_time_spent',
          product_id: product.id,
          category_id: product.category_id,
          metadata: { time_spent_seconds: timeSpent }
        });
      };
    }
    return undefined;
  }, [product, trackProductView, trackEvent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              to="/products" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Browse All Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MaintenanceBanner />
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <StandardBreadcrumbs 
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            ...(product.categories ? [{ label: product.categories.name, href: `/categories/${product.categories.slug}` }] : []),
            { label: product.name, isActive: true }
          ]} 
        />

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 mb-20">
          <ProductImageGallery 
            images={product.product_images || []} 
            productName={product.name}
          />
          <div className="lg:pl-8">
            <ProductInfo product={product} />
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mb-16">
          <ReviewsSection productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <>
            <Separator className="mb-8" />
            <section className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Related Products</h2>
                <p className="text-muted-foreground">
                  You might also like these products
                </p>
              </div>
              <OptimizedProductGrid
                products={relatedProducts}
                isLoading={false}
                viewMode="grid"
              />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
