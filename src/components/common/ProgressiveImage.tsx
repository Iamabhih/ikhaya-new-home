import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ProgressiveImage = ({
  src,
  lowQualitySrc,
  alt,
  className = "",
  width,
  height,
  onLoad,
  onError
}: ProgressiveImageProps) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imageError, setImageError] = useState(false);

  // Generate low quality version URL if not provided
  const getLowQualityUrl = (originalSrc: string): string => {
    if (lowQualitySrc) return lowQualitySrc;
    
    // If it's a Supabase storage URL, generate a low quality version
    if (originalSrc.includes('supabase.co/storage/v1/object/public/')) {
      const url = new URL(originalSrc);
      url.searchParams.set('width', '50');
      url.searchParams.set('quality', '20');
      url.searchParams.set('format', 'webp');
      return url.toString();
    }
    
    return originalSrc;
  };

  const lowQualityUrl = getLowQualityUrl(src);
  const isLowQualityLoaded = loadedImages.has(lowQualityUrl);
  const isHighQualityLoaded = loadedImages.has(src);

  useEffect(() => {
    // Preload low quality image first
    const lowQualityImg = new Image();
    lowQualityImg.onload = () => {
      setLoadedImages(prev => new Set(prev).add(lowQualityUrl));
    };
    lowQualityImg.src = lowQualityUrl;

    // Then preload high quality image
    const highQualityImg = new Image();
    highQualityImg.onload = () => {
      setLoadedImages(prev => new Set(prev).add(src));
      onLoad?.();
    };
    highQualityImg.onerror = () => {
      setImageError(true);
      onError?.();
    };
    highQualityImg.src = src;
  }, [src, lowQualityUrl, onLoad, onError]);

  if (imageError) {
    return (
      <div 
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Loading skeleton */}
      {!isLowQualityLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {/* Low quality image (blurred placeholder) */}
      {isLowQualityLoaded && !isHighQualityLoaded && (
        <img
          src={lowQualityUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 transition-all duration-300"
        />
      )}
      
      {/* High quality image */}
      {isHighQualityLoaded && (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      
      {/* Loading indicator */}
      {!isHighQualityLoaded && isLowQualityLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};