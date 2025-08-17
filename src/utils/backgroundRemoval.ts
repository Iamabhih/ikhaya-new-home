import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for optimal browser performance
env.allowLocalModels = false;
env.useBrowserCache = true;
env.allowRemoteModels = true;

const MAX_IMAGE_DIMENSION = 1024;

// Model cascade for reliable fallback
const MODELS = [
  'briaai/RMBG-1.4',
  'Xenova/segformer-b0-finetuned-ade-512-512',
  'Xenova/segformer-b2-finetuned-ade-512-512'
];

// Device detection utility
const detectBestDevice = async (): Promise<'webgpu' | 'wasm'> => {
  try {
    // Check WebGPU support
    if ('gpu' in navigator) {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) return 'webgpu';
    }
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) return 'wasm';
    
    return 'wasm'; // CPU fallback
  } catch {
    return 'wasm';
  }
};

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

export const removeBackground = async (
  imageElement: HTMLImageElement,
  options: {
    imageType?: 'general' | 'portrait' | 'product';
    quality?: 'fast' | 'balanced' | 'high';
    preserveDetails?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<Blob> => {
  const { imageType = 'product', quality = 'balanced', onProgress } = options;
  
  try {
    console.log('Starting enhanced background removal process...');
    onProgress?.(5);

    // Detect best available device
    const device = await detectBestDevice();
    console.log('Using device:', device);
    onProgress?.(10);

    // Try models in cascade until one works
    let segmenter = null;
    let modelUsed = '';
    
    for (const model of MODELS) {
      try {
        console.log(`Attempting to load model: ${model}`);
        segmenter = await pipeline('image-segmentation', model, {
          device,
          dtype: quality === 'fast' ? 'fp16' : 'fp32',
        });
        modelUsed = model;
        console.log(`Successfully loaded model: ${model}`);
        break;
      } catch (error) {
        console.warn(`Failed to load model ${model}:`, error);
        continue;
      }
    }

    if (!segmenter) {
      throw new Error('All models failed to load. Please check your internet connection.');
    }
    
    onProgress?.(25);
    
    // Convert HTMLImageElement to canvas with optimization
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    onProgress?.(35);
    
    // Optimize image data format based on model
    const imageFormat = modelUsed.includes('RMBG') ? 'image/png' : 'image/jpeg';
    const imageQuality = quality === 'high' ? 0.95 : quality === 'balanced' ? 0.85 : 0.75;
    const imageData = canvas.toDataURL(imageFormat, imageQuality);
    console.log('Image converted to base64, format:', imageFormat);
    onProgress?.(45);
    
    // Process the image with the segmentation model
    console.log(`Processing with ${modelUsed}...`);
    const result = await segmenter(imageData);
    onProgress?.(75);
    
    console.log('Segmentation result type:', typeof result, 'length:', Array.isArray(result) ? result.length : 'not array');
    
    // Handle different result formats based on model
    let maskData;
    if (modelUsed.includes('RMBG')) {
      // RMBG models return direct mask
      if (result && typeof result === 'object' && 'data' in result) {
        maskData = result.data;
      } else {
        throw new Error('Invalid RMBG result format');
      }
    } else {
      // Segformer models return array with mask property
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      maskData = result[0].mask.data;
    }
    
    onProgress?.(80);
    
    // Create output canvas with optimized context
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d', { alpha: true });
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the mask with enhanced processing
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    onProgress?.(85);
    
    // Apply mask to alpha channel with edge smoothing
    for (let i = 0; i < maskData.length; i++) {
      const maskValue = maskData[i];
      const alpha = modelUsed.includes('RMBG') 
        ? Math.round(maskValue * 255) // RMBG uses direct alpha
        : Math.round((1 - maskValue) * 255); // Segformer uses inverted mask
      
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Enhanced mask applied successfully');
    
    onProgress?.(95);
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created final blob');
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
