
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteSettings();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['category-products', category?.id, settings?.hide_products_without_images],
    queryFn: async () => {
      if (!category?.id) return [];
      
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `)
        .eq('category_id', category.id)
        .eq('is_active', true);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        query = query.not('product_images', 'is', null);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-4" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Category not found</h1>
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
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/categories">Categories</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{category.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground text-lg">{category.description}</p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 xs:h-56 sm:h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {products.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
