
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
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="premium-container py-8">
          <div className="animate-pulse premium-spacing">
            <div className="glass-card p-4 mb-8">
              <div className="h-6 bg-muted rounded w-64"></div>
            </div>
            <div className="glass-card p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="aspect-square bg-muted rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
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
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="premium-container py-8">
          <div className="glass-card p-12 text-center hover-lift">
            <h1 className="text-3xl font-bold gradient-text-brand mb-4">Product Not Found</h1>
            <p className="text-premium-muted mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              to="/products" 
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 hover-lift focus-premium transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-subtle">
      <MaintenanceBanner />
      <Header />
      <main className="premium-container py-8 premium-spacing">
        {/* Breadcrumbs */}
        <div className="glass-card p-4 mb-8 hover-lift">
          <StandardBreadcrumbs 
            items={[
              { label: "Home", href: "/" },
              { label: "Products", href: "/products" },
              ...(product.categories ? [{ label: product.categories.name, href: `/categories/${product.categories.slug}` }] : []),
              { label: product.name, isActive: true }
            ]} 
          />
        </div>

        {/* Product Details */}
        <div className="glass-card p-8 mb-12 hover-lift">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16">
            <div className="hover-glow">
              <ProductImageGallery 
                images={product.product_images || []} 
                productName={product.name}
              />
            </div>
            <div className="lg:pl-8">
              <ProductInfo product={product} />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="glass-card p-8 mb-12 hover-lift">
          <div className="mb-6">
            <h2 className="text-3xl font-bold gradient-text-brand text-center mb-2">Customer Reviews</h2>
            <p className="text-premium-muted text-center">What our customers are saying</p>
          </div>
          <ReviewsSection productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="glass-card p-8 hover-lift">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold gradient-text-brand mb-2">Related Products</h2>
              <p className="text-premium-muted">
                You might also like these products
              </p>
            </div>
            <OptimizedProductGrid
              products={relatedProducts}
              isLoading={false}
              viewMode="grid"
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
