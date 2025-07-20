import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: string;
  fallbackSrc?: string;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export const OptimizedImage = ({
  src,
  alt,
  className = "",
  width,
  height,
  placeholder,
  fallbackSrc,
  lazy = true,
  onLoad,
  onError,
  priority = false,
  sizes,
  quality = 80
}: OptimizedImageProps) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, isInView]);

  // Generate optimized URL based on quality and dimensions
  const getOptimizedUrl = (url: string): string => {
    if (!url) return url;
    
    // If it's a Supabase storage URL, we can add transform parameters
    if (url.includes('supabase.co/storage/v1/object/public/')) {
      const params = new URLSearchParams();
      
      if (width) params.append('width', width.toString());
      if (height) params.append('height', height.toString());
      if (quality && quality < 100) params.append('quality', quality.toString());
      params.append('format', 'webp');
      
      if (params.toString()) {
        return `${url}?${params.toString()}`;
      }
    }
    
    return url;
  };

  // Handle image loading
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    const optimizedSrc = getOptimizedUrl(imageSrc);
    
    img.onload = () => {
      setImageState('loaded');
      onLoad?.();
    };
    
    img.onerror = () => {
      if (fallbackSrc && imageSrc !== fallbackSrc) {
        setImageSrc(fallbackSrc);
        return;
      }
      setImageState('error');
      onError?.();
    };
    
    img.src = optimizedSrc;
  }, [isInView, imageSrc, fallbackSrc, onLoad, onError, width, height, quality]);

  // Loading state
  if (!isInView || imageState === 'loading') {
    return (
      <div 
        ref={imgRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {placeholder ? (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover blur-sm scale-110 transition-all duration-300"
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
        
        {/* Loading overlay */}
        <div className="absolute inset-0 bg-background/20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (imageState === 'error') {
    return (
      <div 
        className={`relative overflow-hidden bg-muted flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center justify-center text-muted-foreground p-4">
          <AlertCircle className="w-8 h-8 mb-2" />
          <span className="text-sm text-center">Failed to load image</span>
        </div>
      </div>
    );
  }

  // Loaded state
  return (
    <img
      ref={imgRef}
      src={getOptimizedUrl(imageSrc)}
      alt={alt}
      className={`transition-opacity duration-300 ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ width, height }}
      loading={lazy && !priority ? "lazy" : "eager"}
      sizes={sizes}
      onLoad={() => {
        setImageState('loaded');
        onLoad?.();
      }}
      onError={() => {
        if (fallbackSrc && imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
          return;
        }
        setImageState('error');
        onError?.();
      }}
    />
  );
};