import React, { createContext, useContext, useEffect } from 'react';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  image_status: string;
  products?: {
    id: string;
    name: string;
    sku: string;
  };
}

interface BackgroundRemovalSettings {
  imageType: 'general' | 'portrait' | 'product';
  quality: 'fast' | 'balanced' | 'high';
  preserveDetails: boolean;
  batchSize: number;
  delayBetweenBatches: number;
  delayBetweenItems: number;
  maxRetries: number;
}

interface BackgroundRemovalContextType {
  items: any[];
  isProcessing: boolean;
  currentBatch: number;
  totalBatches: number;
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    progress: number;
  };
  settings: BackgroundRemovalSettings;
  addImages: (images: ProductImage[]) => void;
  startProcessing: () => void;
  stopProcessing: () => void;
  clearItems: () => void;
  removeItem: (itemId: string) => void;
  retryFailedItems: () => void;
  updateSettings: (newSettings: Partial<BackgroundRemovalSettings>) => void;
}

const BackgroundRemovalContext = createContext<BackgroundRemovalContextType | undefined>(undefined);

export const useBackgroundRemoval = () => {
  const context = useContext(BackgroundRemovalContext);
  if (!context) {
    throw new Error('useBackgroundRemoval must be used within a BackgroundRemovalProvider');
  }
  return context;
};

export const BackgroundRemovalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<BackgroundRemovalSettings>({
    imageType: 'product',
    quality: 'balanced',
    preserveDetails: true,
    batchSize: 5,
    delayBetweenBatches: 2000,
    delayBetweenItems: 500,
    maxRetries: 2
  });

  const processImage = async (
    image: ProductImage,
    onProgress?: (progress: number) => void
  ) => {
    try {
      onProgress?.(10);
      
      // Fetch the image
      const response = await fetch(image.image_url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      onProgress?.(20);
      
      const blob = await response.blob();
      const imageElement = await loadImage(blob);
      
      onProgress?.(40);
      
      // Remove background
      const processedBlob = await removeBackground(imageElement);
      
      onProgress?.(70);
      
      // Upload processed image
      const fileName = `processed_${image.id}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`processed/${fileName}`, processedBlob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      onProgress?.(90);
      
      // Update database with processed image URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`processed/${fileName}`);
      
      const { error: updateError } = await supabase
        .from('product_images')
        .update({ 
          image_url: publicUrl,
          image_status: 'background_removed',
          updated_at: new Date().toISOString()
        })
        .eq('id', image.id);
      
      if (updateError) throw updateError;
      
      onProgress?.(100);
      
      return { success: true, newUrl: publicUrl };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const batchProcessor = useBatchProcessor(processImage, {
    batchSize: settings.batchSize,
    delayBetweenBatches: settings.delayBetweenBatches,
    delayBetweenItems: settings.delayBetweenItems,
    maxRetries: settings.maxRetries,
    onBatchStart: (batchIndex, items) => {
      toast({
        title: "Batch Started",
        description: `Processing batch ${batchIndex + 1} with ${items.length} images`,
      });
    },
    onBatchComplete: (batchIndex, results) => {
      const successCount = results.filter(r => r?.success).length;
      toast({
        title: "Batch Complete",
        description: `Batch ${batchIndex + 1} completed: ${successCount}/${results.length} successful`,
      });
    },
    onItemComplete: (itemId, result) => {
      if (result?.success) {
        toast({
          title: "Image Processed",
          description: "Background removed successfully",
        });
      }
    },
    onItemError: (itemId, error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const addImages = (images: ProductImage[]) => {
    const items = images.map(image => ({
      id: image.id,
      data: image
    }));
    batchProcessor.addItems(items);
  };

  const updateSettings = (newSettings: Partial<BackgroundRemovalSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Persist processing state in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('backgroundRemovalState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.items?.length > 0) {
          batchProcessor.addItems(state.items);
        }
      } catch (error) {
        console.error('Failed to restore background removal state:', error);
      }
    }
  }, []);

  useEffect(() => {
    const state = {
      items: batchProcessor.items.map(item => ({ id: item.id, data: item.data })),
      settings
    };
    localStorage.setItem('backgroundRemovalState', JSON.stringify(state));
  }, [batchProcessor.items, settings]);

  const value: BackgroundRemovalContextType = {
    items: batchProcessor.items,
    isProcessing: batchProcessor.isProcessing,
    currentBatch: batchProcessor.currentBatch,
    totalBatches: batchProcessor.totalBatches,
    stats: batchProcessor.getStats,
    settings,
    addImages,
    startProcessing: batchProcessor.startProcessing,
    stopProcessing: batchProcessor.stopProcessing,
    clearItems: batchProcessor.clearItems,
    removeItem: batchProcessor.removeItem,
    retryFailedItems: batchProcessor.retryFailedItems,
    updateSettings
  };

  return (
    <BackgroundRemovalContext.Provider value={value}>
      {children}
    </BackgroundRemovalContext.Provider>
  );
};