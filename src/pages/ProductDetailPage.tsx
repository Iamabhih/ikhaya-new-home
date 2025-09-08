
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

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteSettings();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg w-64 shimmer"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl glass-card"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gradient-to-r from-primary/15 to-secondary/15 rounded-lg w-3/4 shimmer"></div>
                <div className="h-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg w-1/2 shimmer"></div>
                <div className="h-20 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg shimmer"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12 glass-card premium-container">
            <h1 className="text-2xl font-bold mb-4 gradient-text-primary">Product Not Found</h1>
            <p className="text-premium-muted mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              to="/products" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary via-primary-glow to-secondary text-white rounded-xl hover-lift hover-glow shadow-elegant transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
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
        <div className="glass-card rounded-2xl p-6 mb-16 hover-lift shadow-elegant">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16">
            <ProductImageGallery 
              images={product.product_images || []} 
              productName={product.name}
            />
            <div className="lg:pl-8">
              <ProductInfo product={product} />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="glass-card rounded-2xl p-6 mb-16 hover-lift shadow-elegant">
          <ReviewsSection productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="glass-card rounded-2xl p-6 hover-lift shadow-elegant">
            <section className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2 gradient-text-primary">Related Products</h2>
                <p className="text-premium-muted">
                  You might also like these products
                </p>
              </div>
              <OptimizedProductGrid
                products={relatedProducts}
                isLoading={false}
                viewMode="grid"
              />
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
