import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowRight } from "lucide-react";

const CategoriesPage = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-16">
        <div className="container mx-auto px-4">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Categories</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Shop by Category
            </h1>
            <p className="text-muted-foreground text-xl leading-relaxed">
              Discover our carefully curated collection of homeware organized by room and function. 
              Find everything you need to transform your space.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <main className="container mx-auto px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="group">
                <div className="bg-muted animate-pulse rounded-2xl h-72 mb-4" />
                <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {categories.map((category) => (
              <Link key={category.id} to={`/categories/${category.slug}`} className="group">
                <Card className="border-0 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 overflow-hidden h-full">
                  {/* Image Container */}
                  <div className="relative h-56 overflow-hidden bg-gradient-to-br from-secondary/20 to-secondary/40">
                    {category.image_url ? (
                      <>
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-4xl font-bold text-primary/60">
                          {category.name.charAt(0)}
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Arrow */}
                    <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-200">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}
                    
                    {/* View Category Link */}
                    <div className="flex items-center mt-4 text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
                      <span>View Category</span>
                      <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {!isLoading && categories.length > 0 && (
          <div className="text-center mt-16 py-12 bg-gradient-to-r from-secondary/20 to-secondary/30 rounded-3xl">
            <h2 className="text-3xl font-bold mb-4">Can't Find What You're Looking For?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Browse our complete product collection or get in touch with our team for personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/products" 
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                View All Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link 
                to="/contact" 
                className="inline-flex items-center px-6 py-3 border border-primary text-primary rounded-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default CategoriesPage;