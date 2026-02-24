
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { OptimizedProductGrid } from "@/components/products/OptimizedProductGrid";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
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
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Breadcrumb skeleton */}
          <div className="h-4 bg-muted rounded w-64 mb-8 animate-pulse" />

          {/* Main product skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 mb-20">
            {/* Gallery skeleton */}
            <div className="space-y-4 animate-pulse">
              <div className="aspect-square bg-muted rounded-2xl" />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-20 h-20 bg-muted rounded-xl flex-shrink-0" />
                ))}
              </div>
            </div>

            {/* Info skeleton */}
            <div className="space-y-5 animate-pulse">
              <div className="h-3 bg-muted rounded w-24" />
              <div className="space-y-2">
                <div className="h-9 bg-muted rounded w-4/5" />
                <div className="h-9 bg-muted rounded w-3/5" />
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <div key={i} className="h-4 w-4 bg-muted rounded" />)}
              </div>
              <div className="h-px bg-muted rounded" />
              <div className="h-10 bg-muted rounded w-40" />
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-px bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
              </div>
              <div className="h-12 bg-muted rounded" />
              <div className="h-20 bg-muted rounded-xl" />
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
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-3">Product Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumbs */}
        <div className="mb-8">
          <StandardBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Products", href: "/products" },
              ...(product.categories
                ? [{ label: product.categories.name, href: `/categories/${product.categories.slug}` }]
                : []),
              { label: product.name, isActive: true }
            ]}
          />
        </div>

        {/* Product Detail — two-column premium layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 mb-20 items-start">
          {/* Left: Image Gallery */}
          <div className="lg:sticky lg:top-8">
            <ProductImageGallery
              images={product.product_images || []}
              productName={product.name}
            />
          </div>

          {/* Right: Product Info */}
          <ProductInfo product={product} />
        </div>

        {/* Reviews */}
        <div className="mb-16">
          <ReviewsSection productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="space-y-8">
            <Separator />
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-1">
                You May Also Like
              </p>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Related Products
              </h2>
            </div>
            <OptimizedProductGrid
              products={relatedProducts}
              isLoading={false}
              viewMode="grid"
            />
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
