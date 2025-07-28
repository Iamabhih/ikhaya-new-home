import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Home } from "lucide-react";
import { Link } from "react-router-dom";
export const HeroSection = () => {
  return <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-6 py-3 mb-8 shadow-glass hover-glow">
            <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
            <span className="text-sm font-medium gradient-text-brand">
              Premium Homeware Collection
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight text-foreground">
            Transform Your House Into a 
            <span className="block gradient-text-brand">
              Beautiful Home
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl mb-12 leading-relaxed max-w-4xl mx-auto text-premium">
            Discover our curated collection of quality homeware, furniture, and decor items that make your space uniquely yours. From kitchen essentials to bedroom comfort, we have everything you need to create your perfect sanctuary.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link to="/products">
              <Button size="lg" className="w-full sm:w-auto px-8 py-4 text-lg hover-glow group">
                <Home className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                Shop Now 
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 py-4 text-lg hover-glow-secondary">
                Browse Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="glass-card rounded-2xl p-6 shadow-premium hover-lift">
              <div className="text-3xl font-bold gradient-text-primary mb-2">
                1000+
              </div>
              <div className="text-premium-muted">Quality Products</div>
            </div>
            <div className="glass-card rounded-2xl p-6 shadow-premium hover-lift">
              <div className="text-3xl font-bold gradient-text-secondary mb-2">
                50+
              </div>
              <div className="text-premium-muted">Categories</div>
            </div>
            <div className="glass-card rounded-2xl p-6 shadow-premium hover-lift">
              <div className="text-3xl font-bold gradient-text-brand mb-2">
                24/7
              </div>
              <div className="text-premium-muted">Customer Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/40 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary/60 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>;
};