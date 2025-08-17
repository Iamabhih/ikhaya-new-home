
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Badge } from "@/components/ui/badge";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  
  const sortedImages = images.sort((a, b) => {
    // Primary image first, then by sort order
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  
  const currentImage = sortedImages[currentImageIndex];
  
  // Preload all images for smooth gallery experience
  const imageUrls = sortedImages.map(img => img.image_url);
  const { isLoading, progress } = useImagePreloader(imageUrls, { priority: true });

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  }, [currentImageIndex]);

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  if (!sortedImages.length) {
    return (
      <div className="aspect-square bg-[hsl(var(--product-image-bg))] flex items-center justify-center rounded-lg">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[hsl(var(--product-image-bg))] shadow-xl group">
          <div onClick={() => setIsFullscreen(true)} className="cursor-zoom-in">
            <OptimizedImage
              src={currentImage.image_url}
              alt={currentImage.alt_text || productName}
              className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
              lazy={false}
              priority={true}
            />
          </div>
          
          {/* Loading progress indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/20 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-muted-foreground">{Math.round(progress)}%</div>
              </div>
            </div>
          )}

          {/* Primary badge */}
          {currentImage.is_primary && (
            <Badge className="absolute top-4 left-4 bg-primary/90">
              Primary Image
            </Badge>
          )}

          {/* Fullscreen button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 bg-background/90 hover:bg-background shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
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
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sortedImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentImageIndex(index)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3 transition-all duration-200 ${
                  index === currentImageIndex 
                    ? 'border-primary shadow-lg scale-105' 
                    : 'border-transparent hover:border-border/50 hover:scale-102'
                }`}
              >
                <div className="w-full h-full bg-[hsl(var(--product-image-bg))] flex items-center justify-center">
                  <OptimizedImage
                    src={image.image_url}
                    alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                    className="w-full h-full object-contain"
                    lazy={true}
                  />
                </div>
                {image.is_primary && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95">
          <VisuallyHidden>
            <DialogTitle>Product Image Gallery - {productName}</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              {zoomLevel > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={resetZoom}
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Navigation arrows */}
            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-50"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-50"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Main fullscreen image */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                ref={imageRef}
                src={currentImage.image_url}
                alt={currentImage.alt_text || productName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                }}
                onClick={zoomLevel === 1 ? handleZoomIn : undefined}
                draggable={false}
              />
            </div>

            {/* Image info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
              <p className="text-sm">
                {currentImageIndex + 1} of {sortedImages.length}
                {currentImage.alt_text && ` - ${currentImage.alt_text}`}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
