import { useEffect, useState } from "react";

interface UseImagePreloaderOptions {
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const useImagePreloader = (
  src: string | string[],
  options: UseImagePreloaderOptions = {}
) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const { priority = false, onLoad, onError } = options;
  const imageUrls = Array.isArray(src) ? src : [src];

  useEffect(() => {
    if (imageUrls.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadedImages(new Set());
    setFailedImages(new Set());

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
          onLoad?.();
          resolve();
        };
        
        img.onerror = () => {
          setFailedImages(prev => new Set(prev).add(url));
          onError?.();
          reject(new Error(`Failed to load image: ${url}`));
        };

        // Set loading priority
        if (priority) {
          img.loading = 'eager';
        }

        img.src = url;
      });
    };

    // Load all images
    Promise.allSettled(imageUrls.map(loadImage))
      .then(() => {
        setIsLoading(false);
      });

  }, [imageUrls.join(','), priority, onLoad, onError]);

  const isImageLoaded = (url: string) => loadedImages.has(url);
  const isImageFailed = (url: string) => failedImages.has(url);
  const allImagesLoaded = imageUrls.every(url => loadedImages.has(url));
  const anyImageFailed = imageUrls.some(url => failedImages.has(url));

  return {
    isLoading,
    loadedImages: Array.from(loadedImages),
    failedImages: Array.from(failedImages),
    isImageLoaded,
    isImageFailed,
    allImagesLoaded,
    anyImageFailed,
    loadedCount: loadedImages.size,
    totalCount: imageUrls.length,
    progress: imageUrls.length > 0 ? (loadedImages.size / imageUrls.length) * 100 : 100
  };
};