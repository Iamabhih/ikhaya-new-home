import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Home } from "lucide-react";
import { Link } from "react-router-dom";
export const HeroSection = () => {
  return (
    <section className="relative bg-background py-20 lg:py-32 overflow-hidden"
      style={{ 
        marginTop: 0,
        paddingTop: 'max(5rem, calc(64px + 2rem))', // Account for header height
        minHeight: 'calc(100vh - 64px)' // Viewport height minus header
      }}
    >
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Premium Homeware Collection
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-foreground">
            Transform Your House Into a 
            <span className="block text-primary mt-2">
              Beautiful Home
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-3xl mx-auto text-muted-foreground">
            Discover our curated collection of quality homeware, furniture, and decor items that make your space uniquely yours. From kitchen essentials to bedroom comfort, we have everything you need.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/products">
              <Button size="lg" className="w-full sm:w-auto px-8 py-3 group">
                <Home className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                Shop Now 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-3">
                Browse Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                1000+
              </div>
              <div className="text-muted-foreground">Quality Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">8+</div>
              <div className="text-muted-foreground">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                24/7
              </div>
              <div className="text-muted-foreground">Shopping</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};