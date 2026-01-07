import React from 'react';
import { UnifiedImageManager } from './UnifiedImageManager';

interface ProductImageManagerProps {
  productId?: string;
  productName?: string;
  productSku?: string;
  currentImages?: string[];
  onImagesChange?: (images: string[]) => void;
  className?: string;
}

/**
 * Product Image Manager - wrapper around UnifiedImageManager
 * Provides a simplified interface for managing product images
 */
export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productId,
  productName,
  productSku,
  currentImages = [],
  onImagesChange,
  className
}) => {
  return (
    <UnifiedImageManager
      productId={productId}
      productName={productName}
      productSku={productSku}
      currentImages={currentImages}
      onImagesChange={onImagesChange}
      className={className}
    />
  );
};

export default ProductImageManager;
