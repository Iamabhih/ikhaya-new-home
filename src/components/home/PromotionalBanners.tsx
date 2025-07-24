import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";

type PromotionalBanner = Tables<"promotional_banners">;

export const PromotionalBanners = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 8000); // Auto-slide every 8 seconds for better UX
      
      return () => clearInterval(timer);
    }
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order("position");

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching promotional banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading) {
    return (
      <div className="relative w-full bg-primary/5 overflow-hidden">
        <div className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-primary/20 rounded w-48 mx-auto"></div>
            <div className="h-6 bg-primary/15 rounded w-32 mx-auto"></div>
            <div className="h-12 bg-primary/10 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full bg-primary/5 overflow-hidden">
      {/* Main promotional banner */}
      <div 
        className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center text-white transition-all duration-500"
        style={{ backgroundColor: currentBanner.background_color }}
      >
        {/* Background Image */}
        {currentBanner.image_url && (
          <div className="absolute inset-0">
            <img 
              src={currentBanner.image_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            {((currentBanner as any).overlay_opacity ?? 0.2) > 0 && (
              <div 
                className="absolute inset-0"
                style={{ 
                  backgroundColor: 'black', 
                  opacity: (currentBanner as any).overlay_opacity ?? 0.2 
                }}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left side - Text content */}
              <div className="space-y-6" style={{ color: currentBanner.text_color }}>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  {currentBanner.title}
                </h1>
                
                {currentBanner.subtitle && (
                  <h2 className="text-xl md:text-3xl font-medium opacity-90">
                    {currentBanner.subtitle}
                  </h2>
                )}
                
                {currentBanner.description && (
                  <p className="text-lg md:text-xl opacity-80 max-w-md">
                    {currentBanner.description}
                  </p>
                )}
                
                {currentBanner.button_text && currentBanner.button_url && (
                  <Link to={currentBanner.button_url}>
                    <Button 
                      size="lg" 
                      className="mt-6 px-8 py-4 text-lg bg-white text-black hover:bg-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                    >
                      {currentBanner.button_text}
                    </Button>
                  </Link>
                )}
              </div>

              {/* Right side - Visual element */}
              <div className="relative">
                <div className="text-6xl md:text-8xl font-black opacity-20 transform rotate-12">
                  SALE
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-4xl md:text-6xl font-black" style={{ color: currentBanner.text_color }}>
                    {currentBanner.title.split(' ').map((word, index) => (
                      <div key={index} className="transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors duration-200"
              style={{ color: currentBanner.text_color }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors duration-200"
              style={{ color: currentBanner.text_color }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Slide indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Top promotional strips */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {banners.slice(0, 3).map((banner) => (
              <div 
                key={banner.id}
                className="flex items-center justify-center p-3 rounded-lg text-center transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: `${banner.background_color}20`,
                  borderColor: banner.background_color,
                  borderWidth: '1px'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: banner.background_color, color: banner.text_color }}
                  >
                    {banner.position}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{banner.title}</div>
                    {banner.subtitle && (
                      <div className="text-xs text-muted-foreground">{banner.subtitle}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};