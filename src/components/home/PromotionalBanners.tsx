import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { UniversalLoading } from "@/components/ui/universal-loading";
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
      }, 8000); // Auto-slide every 8 seconds for better UX

      return () => clearInterval(timer);
    }
  }, [banners.length]);
  const fetchBanners = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("promotional_banners").select("*").eq("is_active", true).or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`).or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`).order("position");
      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching promotional banners:", error);
    } finally {
      setLoading(false);
    }
  };
  const nextSlide = () => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  };
  const prevSlide = () => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  };
  if (loading) {
    return (
      <div className="relative w-full bg-primary/5 overflow-hidden banner-loading">
        <div className="relative min-h-[300px] sm:min-h-[400px] md:min-h-[500px] flex items-center justify-center">
          <UniversalLoading 
            variant="spinner" 
            size="lg" 
            text="Loading promotional content..." 
            className="text-white"
          />
        </div>
      </div>
    );
  }
  if (banners.length === 0) {
    return null;
  }
  const currentBanner = banners[currentIndex];
  return <div className="relative w-full overflow-hidden banner-container">
      {/* Main promotional banner */}
      <div 
        className="relative banner-main min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center text-white transition-all duration-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
        style={{
          background: currentBanner.background_color ? `linear-gradient(135deg, ${currentBanner.background_color} 0%, ${currentBanner.background_color}cc 50%, ${currentBanner.background_color}99 100%)` : undefined,
          aspectRatio: 'auto'
        }}
      >
        {/* Background Image */}
        {currentBanner.image_url && <div className="absolute inset-0 banner-image-wrapper">
            <img 
              src={currentBanner.image_url} 
              alt={currentBanner.title || "Promotional banner"} 
              className="w-full h-full object-cover"
              loading="eager"
              style={{
                objectFit: 'cover',
                objectPosition: 'center'
              }}
            />
            {((currentBanner as any).overlay_opacity ?? 0) > 0 && <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, rgba(0,0,0,${(currentBanner as any).overlay_opacity}) 0%, rgba(0,0,0,${((currentBanner as any).overlay_opacity) * 0.7}) 100%)`
        }} />}
          </div>}


        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
              {/* Left side - Text content */}
              <div 
                className="space-y-4 sm:space-y-6 md:space-y-8 text-left banner-content" 
                style={{
                  color: currentBanner.text_color,
                  textShadow: (currentBanner as any).text_shadow !== 'none' ? (currentBanner as any).text_shadow : '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {currentBanner.title && currentBanner.title.trim() && (
                  <h1 
                    className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight banner-title"
                    style={{ 
                      fontFamily: (currentBanner as any).title_font_family || 'Playfair Display',
                      fontWeight: (currentBanner as any).title_font_weight || '900',
                      textShadow: (currentBanner as any).title_shadow !== 'none' ? (currentBanner as any).title_shadow : '0 4px 12px rgba(0,0,0,0.4)',
                      background: 'linear-gradient(135deg, currentColor 0%, rgba(255,255,255,0.8) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      color: currentBanner.text_color
                    }}
                  >
                    {currentBanner.title}
                  </h1>
                )}
                
                {currentBanner.subtitle && (
                  <h2 
                    className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light opacity-95 tracking-wide banner-subtitle"
                    style={{ 
                      fontFamily: (currentBanner as any).subtitle_font_family || 'Inter',
                      fontWeight: (currentBanner as any).subtitle_font_weight || '300',
                      textShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}
                  >
                    {currentBanner.subtitle}
                  </h2>
                )}
                
                {currentBanner.description && (
                  <p 
                    className="text-base sm:text-lg md:text-xl opacity-90 max-w-lg leading-relaxed banner-description"
                    style={{ 
                      fontFamily: (currentBanner as any).description_font_family || 'Inter',
                      fontWeight: (currentBanner as any).description_font_weight || '400',
                      textShadow: '0 1px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    {currentBanner.description}
                  </p>
                )}
                
                {currentBanner.button_text && currentBanner.button_url && (
                  <div className="pt-2 sm:pt-4">
                    <Link to={currentBanner.button_url}>
                      <Button 
                        size="lg" 
                        className="px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg font-semibold bg-white text-slate-900 hover:bg-white/95 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-0 rounded-full touch-target"
                        aria-label={`${currentBanner.button_text} - ${currentBanner.title}`}
                      >
                        {currentBanner.button_text}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {banners.length > 1 && <>
            <button 
              onClick={prevSlide} 
              className="banner-nav banner-nav-left absolute left-2 sm:left-4 md:left-6 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 md:p-4 transition-all duration-300 hover:scale-110 border border-white/20 touch-target z-20" 
              style={{
                color: currentBanner.text_color,
                WebkitBackdropFilter: 'blur(8px)',
                backdropFilter: 'blur(8px)'
              }}
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
            </button>
            <button 
              onClick={nextSlide} 
              className="banner-nav banner-nav-right absolute right-2 sm:right-4 md:right-6 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 sm:p-3 md:p-4 transition-all duration-300 hover:scale-110 border border-white/20 touch-target z-20" 
              style={{
                color: currentBanner.text_color,
                WebkitBackdropFilter: 'blur(8px)',
                backdropFilter: 'blur(8px)'
              }}
              aria-label="Next banner"
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
            </button>
          </>}

        {/* Slide indicators */}
        {banners.length > 1 && <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 sm:gap-3 z-20">
            {banners.map((_, index) => <button 
              key={index} 
              onClick={() => setCurrentIndex(index)} 
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 border-2 border-white/30 touch-target ${index === currentIndex ? 'bg-white scale-110' : 'bg-white/30 hover:bg-white/50'}`}
              aria-label={`Go to banner ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />)}
          </div>}
      </div>

      {/* Premium promotional strips */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200/50 banner-strips">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {banners.slice(0, 3).map((banner, index) => (
              <div 
                key={banner.id} 
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer touch-target"
                onClick={() => setCurrentIndex(index)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && setCurrentIndex(index)}
                aria-label={`View ${banner.title} banner`}
              >
                {/* Banner Image Background */}
                {banner.image_url && (
                  <div className="absolute inset-0">
                    <img 
                      src={banner.image_url} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                  </div>
                )}
                
                {/* Gradient overlay for better text readability */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `linear-gradient(135deg, ${banner.background_color}60 0%, ${banner.background_color}20 100%)`
                  }}
                />
                
                {/* Content */}
                <div className="relative p-4 sm:p-6 flex items-center justify-between min-h-[100px] sm:min-h-[120px]">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Premium badge with banner color */}
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg border-2 border-white/20 flex-shrink-0"
                      style={{ backgroundColor: banner.background_color }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>
                    
                    {/* Text content */}
                    <div className="min-w-0">
                      <div className="font-bold text-base sm:text-lg text-white group-hover:text-white/90 transition-colors drop-shadow-lg truncate">
                        {banner.title}
                      </div>
                      {banner.subtitle && (
                        <div className="text-xs sm:text-sm text-white/90 font-medium drop-shadow-md truncate">
                          {banner.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="text-white/80 group-hover:text-white transition-colors drop-shadow-lg flex-shrink-0" aria-hidden="true">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at center, ${banner.background_color}80 0%, transparent 70%)`
                  }}
                />
                
                {/* Active indicator */}
                {index === currentIndex && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full shadow-lg animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>;
};