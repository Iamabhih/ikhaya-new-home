
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useImagePreloader } from "@/hooks/useImagePreloader";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export const ProductImageGallery = ({ images, productName }: ProductImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const sortedImages = images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const currentImage = sortedImages[currentImageIndex];
  
  // Preload all images for smooth gallery experience
  const imageUrls = sortedImages.map(img => img.image_url);
  const { isLoading, progress } = useImagePreloader(imageUrls, { priority: true });

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  if (!sortedImages.length) {
    return (
      <div className="aspect-square bg-secondary/20 flex items-center justify-center rounded-lg">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary/10 shadow-xl">
        <OptimizedImage
          src={currentImage.image_url}
          alt={currentImage.alt_text || productName}
          className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
          lazy={false}
          priority={true}
        />
        
        {/* Loading progress indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/20 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-muted-foreground">{Math.round(progress)}%</div>
            </div>
          </div>
        )}
        
        {sortedImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/90 hover:bg-background shadow-lg"
              onClick={goToNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            {/* Image Counter */}
            <div className="absolute bottom-4 right-4 bg-background/90 px-3 py-1 rounded-full text-sm font-medium">
              {currentImageIndex + 1} / {sortedImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {sortedImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentImageIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3 transition-all duration-200 ${
                index === currentImageIndex 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-transparent hover:border-border/50 hover:scale-102'
              }`}
            >
              <OptimizedImage
                src={image.image_url}
                alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                className="w-full h-full object-contain"
                lazy={true}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
