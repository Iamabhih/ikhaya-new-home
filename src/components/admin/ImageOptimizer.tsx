
import { useState } from 'react';

interface ImageOptimizerProps {
  file: File;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onOptimized: (optimizedFile: File) => void;
}

export const ImageOptimizer = ({ 
  file, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.8,
  onOptimized 
}: ImageOptimizerProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          }
        }, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const optimizedFile = await optimizeImage(file);
      onOptimized(optimizedFile);
    } catch (error) {
      console.error('Image optimization failed:', error);
      onOptimized(file); // Fall back to original
    } finally {
      setIsOptimizing(false);
    }
  };

  // Auto-optimize on mount
  useState(() => {
    handleOptimize();
  });

  if (isOptimizing) {
    return <div className="text-sm text-muted-foreground">Optimizing image...</div>;
  }

  return null;
};
