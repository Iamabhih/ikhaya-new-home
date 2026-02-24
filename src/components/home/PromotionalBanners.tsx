import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

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
        setCurrentIndex(prev => (prev + 1) % banners.length);
      }, 6000);
      return () => clearInterval(timer);
    }
    return undefined;
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

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const bannerSwipe = useSwipeGesture({
    onSwipeLeft: nextSlide,
    onSwipeRight: prevSlide,
  });

  if (loading) {
    return (
      <section className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] bg-muted/30 -mt-12 xs:-mt-14 sm:-mt-16">
        <div className="absolute inset-0 flex items-center justify-center">
          <UniversalLoading variant="spinner" size="lg" />
        </div>
      </section>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section
      className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] overflow-hidden -mt-12 xs:-mt-14 sm:-mt-16 touch-manipulation"
      {...bannerSwipe}
    >
      {/* Main Banner */}
      <div className="absolute inset-0 transition-opacity duration-700">
        {/* Background Image */}
        {currentBanner.image_url && (
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title || "Promotional banner"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        )}

        {/* Gradient Overlay - Clean dark overlay for furniture imagery */}
        <div
          className="absolute inset-0"
          style={{
            background: currentBanner.image_url
              ? 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)'
              : currentBanner.background_color
                ? `linear-gradient(135deg, ${currentBanner.background_color} 0%, ${currentBanner.background_color}dd 100%)`
                : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
          }}
        />
        {/* Bottom vignette for stronger text separation */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            {/* Badge */}
            {currentBanner.subtitle && (
              <span
                className="inline-block text-xs sm:text-sm font-medium tracking-widest uppercase mb-4 sm:mb-6 opacity-90 border border-white/30 rounded-full px-4 py-1 bg-white/10 backdrop-blur-sm"
                style={{ color: currentBanner.text_color || '#ffffff' }}
              >
                {currentBanner.subtitle}
              </span>
            )}

            {/* Title */}
            {currentBanner.title && (
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-4 sm:mb-6"
                style={{
                  color: currentBanner.text_color || '#ffffff',
                  fontFamily: (currentBanner as any).title_font_family || 'inherit'
                }}
              >
                {currentBanner.title}
              </h1>
            )}

            {/* Description */}
            {currentBanner.description && (
              <p
                className="text-base sm:text-lg md:text-xl opacity-90 mb-6 sm:mb-8 max-w-xl leading-relaxed"
                style={{ color: currentBanner.text_color || '#ffffff' }}
              >
                {currentBanner.description}
              </p>
            )}

            {/* CTA Button - Clean furniture store style */}
            {currentBanner.button_text && currentBanner.button_url && (
              <Link to={currentBanner.button_url}>
                <Button
                  size="lg"
                  className="px-8 sm:px-12 py-6 sm:py-7 text-sm sm:text-base font-semibold uppercase tracking-wider bg-white text-slate-900 hover:bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                  {currentBanner.button_text}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 hidden sm:flex">
        <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent animate-pulse-soft" />
        <span className="text-white/50 text-2xs uppercase tracking-[0.2em]">Scroll</span>
      </div>

      {/* Navigation - Only show if multiple banners */}
      {banners.length > 1 && (
        <>
          {/* Arrow Navigation */}
          <button
            onClick={prevSlide}
            className="absolute left-2 xs:left-4 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-300 text-white z-20"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 xs:right-4 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-300 text-white z-20"
            aria-label="Next banner"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Slide Indicators - Bottom left, minimal */}
          <div className="absolute bottom-8 left-6 sm:left-8 lg:left-12 flex items-center z-20">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className="flex items-center justify-center px-1.5 py-5"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/40 hover:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
