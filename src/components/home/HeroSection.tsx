import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Home } from "lucide-react";
import { Link } from "react-router-dom";
export const HeroSection = () => {
  return (
    <section className="relative bg-background py-8 sm:py-12 md:py-16 overflow-hidden"
      style={{ 
        marginTop: 0,
        paddingTop: 'max(2rem, calc(56px + 1rem))', // Account for mobile header height
        minHeight: 'auto' // Remove fixed viewport height
      }}
    >
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 sm:top-20 right-10 sm:right-20 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 sm:bottom-20 left-10 sm:left-20 w-40 sm:w-60 md:w-80 h-40 sm:h-60 md:h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm font-bold text-primary tracking-wider">
              YOUR TRUSTED
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-center mx-auto">
            <span className="block text-foreground text-center">
              Manufacturer - Importer - Distributor
            </span>
          </h1>

          {/* Subheading - Product Categories */}
          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 leading-relaxed max-w-4xl mx-auto px-2 sm:px-0 text-center">
            <span className="block text-muted-foreground font-medium mb-2">
              Glassware • Aluminiumware • Enamelware • Stainless Steelware • Cutlery
            </span>
            <span className="block text-muted-foreground font-medium">
              Plasticware • Carpets • Artificial Flowers • Homedecor • General Homeware • Hardware
            </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 md:mb-16 px-4 sm:px-0">
            <Link to="/products" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3 group text-sm sm:text-base">
                <Home className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-12 transition-transform duration-300" />
                Shop Now 
                <ArrowRight className="ml-1.5 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
            <Link to="/categories" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3 text-sm sm:text-base">
                Browse Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-2xl mx-auto px-4 sm:px-0">
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">
                1000+
              </div>
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Quality Products</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">8+</div>
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">
                24/7
              </div>
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground">Shopping</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};