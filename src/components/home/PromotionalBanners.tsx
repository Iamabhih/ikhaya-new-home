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
    return <div className="relative w-full bg-primary/5 overflow-hidden">
        <div className="relative min-h-[400px] md:min-h-[500px] flex items-center justify-center bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-primary/20 rounded w-48 mx-auto"></div>
            <div className="h-6 bg-primary/15 rounded w-32 mx-auto"></div>
            <div className="h-12 bg-primary/10 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>;
  }
  if (banners.length === 0) {
    return null;
  }
  const currentBanner = banners[currentIndex];
  return <div className="relative w-full overflow-hidden">
      {/* Main promotional banner */}
      <div className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center text-white transition-all duration-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{
      background: currentBanner.background_color ? `linear-gradient(135deg, ${currentBanner.background_color} 0%, ${currentBanner.background_color}cc 50%, ${currentBanner.background_color}99 100%)` : undefined
    }}>
        {/* Background Image */}
        {currentBanner.image_url && <div className="absolute inset-0">
            <img src={currentBanner.image_url} alt="" className="w-full h-full object-cover scale-105" />
            {((currentBanner as any).overlay_opacity ?? 0) > 0 && <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, rgba(0,0,0,${(currentBanner as any).overlay_opacity}) 0%, rgba(0,0,0,${((currentBanner as any).overlay_opacity) * 0.7}) 100%)`
        }} />}
          </div>}


        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[500px]">
              {/* Left side - Text content */}
              <div 
                className="space-y-8 text-left" 
                style={{
                  color: currentBanner.text_color,
                  textShadow: (currentBanner as any).text_shadow !== 'none' ? (currentBanner as any).text_shadow : '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <h1 
                  className="text-5xl md:text-7xl xl:text-8xl font-black leading-none tracking-tight"
                  style={{ 
                    fontFamily: (currentBanner as any).title_font_family || 'Playfair Display',
                    fontWeight: (currentBanner as any).title_font_weight || '900',
                    textShadow: (currentBanner as any).title_shadow !== 'none' ? (currentBanner as any).title_shadow : '0 4px 12px rgba(0,0,0,0.4)',
                    background: 'linear-gradient(135deg, currentColor 0%, rgba(255,255,255,0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {currentBanner.title}
                </h1>
                
                {currentBanner.subtitle && (
                  <h2 
                    className="text-2xl md:text-4xl font-light opacity-95 tracking-wide"
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
                    className="text-xl md:text-2xl opacity-90 max-w-lg leading-relaxed"
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
                  <div className="pt-4">
                    <Link to={currentBanner.button_url}>
                      <Button 
                        size="lg" 
                        className="px-12 py-6 text-lg font-semibold bg-white text-slate-900 hover:bg-white/95 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-0 rounded-full"
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
            <button onClick={prevSlide} className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-4 transition-all duration-300 hover:scale-110 border border-white/20" style={{
          color: currentBanner.text_color
        }}>
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button onClick={nextSlide} className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-4 transition-all duration-300 hover:scale-110 border border-white/20" style={{
          color: currentBanner.text_color
        }}>
              <ChevronRight className="h-8 w-8" />
            </button>
          </>}

        {/* Slide indicators */}
        {banners.length > 1 && <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
            {banners.map((_, index) => <button key={index} onClick={() => setCurrentIndex(index)} className={`w-4 h-4 rounded-full transition-all duration-300 border-2 border-white/30 ${index === currentIndex ? 'bg-white scale-110' : 'bg-white/30 hover:bg-white/50'}`} />)}
          </div>}
      </div>

      {/* Premium promotional strips */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-t border-slate-200/50">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {banners.slice(0, 3).map((banner, index) => (
              <div 
                key={banner.id} 
                className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setCurrentIndex(index)}
              >
                {/* Banner Image Background */}
                {banner.image_url && (
                  <div className="absolute inset-0">
                    <img 
                      src={banner.image_url} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
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
                <div className="relative p-6 flex items-center justify-between min-h-[120px]">
                  <div className="flex items-center gap-4">
                    {/* Premium badge with banner color */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white/20"
                      style={{ backgroundColor: banner.background_color }}
                    >
                      {index + 1}
                    </div>
                    
                    {/* Text content */}
                    <div>
                      <div className="font-bold text-lg text-white group-hover:text-white/90 transition-colors drop-shadow-lg">
                        {banner.title}
                      </div>
                      {banner.subtitle && (
                        <div className="text-sm text-white/90 font-medium drop-shadow-md">
                          {banner.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow indicator */}
                  <div className="text-white/80 group-hover:text-white transition-colors drop-shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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