import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for reliable browser performance
env.allowLocalModels = false;
env.useBrowserCache = true;
env.allowRemoteModels = true;

const MAX_IMAGE_DIMENSION = 512; // Reduced for better performance

// Simplified model selection - use proven, reliable model
const PRIMARY_MODEL = 'Xenova/segformer-b0-finetuned-ade-512-512';

interface ProcessingOptions {
  imageType?: 'general' | 'portrait' | 'product';
  quality?: 'fast' | 'balanced' | 'high';
  onProgress?: (progress: number) => void;
}

// Device detection utility
const detectBestDevice = async (): Promise<'webgpu' | 'wasm'> => {
  try {
    // Try WebGPU first
    if ('gpu' in navigator) {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) {
        console.log('WebGPU detected and available');
        return 'webgpu';
      }
    }
    
    // Fallback to WebGL/WASM
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      console.log('WebGL detected, using WASM backend');
      return 'wasm';
    }
    
    console.log('Falling back to CPU/WASM');
    return 'wasm';
  } catch (error) {
    console.warn('Error detecting device capabilities:', error);
    return 'wasm';
  }
};

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement): boolean {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  // Always resize to manageable dimensions for better performance
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
  options: ProcessingOptions = {}
): Promise<Blob> => {
  const { onProgress } = options;
  
  try {
    console.log('Starting simplified background removal process...');
    onProgress?.(5);

    // Detect best available device
    const device = await detectBestDevice();
    onProgress?.(15);

    // Load the proven segmentation model
    console.log(`Loading model: ${PRIMARY_MODEL} on ${device}`);
    const segmenter = await pipeline('image-segmentation', PRIMARY_MODEL, {
      device: device,
      dtype: device === 'webgpu' ? 'fp32' : 'fp32', // Use fp32 for better compatibility
    });
    
    console.log('Model loaded successfully');
    onProgress?.(35);
    
    // Convert HTMLImageElement to canvas with optimization
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    onProgress?.(45);
    
    // Convert to optimized format for the model
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    console.log('Image converted to base64');
    onProgress?.(55);
    
    // Process the image with the segmentation model
    console.log('Processing with segmentation model...');
    const result = await segmenter(imageData);
    onProgress?.(75);
    
    console.log('Segmentation result:', result);
    
    // Validate result format
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid segmentation result: empty or malformed');
    }

    // Find the person/object mask (usually the first result)
    let maskData = null;
    for (const segment of result) {
      if (segment.mask && segment.mask.data) {
        maskData = segment.mask.data;
        console.log(`Using mask from label: ${segment.label || 'unknown'}`);
        break;
      }
    }

    if (!maskData) {
      throw new Error('No valid mask found in segmentation result');
    }
    
    onProgress?.(85);
    
    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d', { alpha: true });
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the mask to alpha channel
    const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    onProgress?.(90);
    
    // Apply mask to alpha channel (invert mask to keep subject)
    for (let i = 0; i < maskData.length; i++) {
      const maskValue = maskData[i];
      // Invert the mask: keep high mask values (subject), remove low values (background)
      const alpha = Math.round((1 - maskValue) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Mask applied successfully');
    
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
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background:', error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to download AI model. Please check your internet connection.');
      } else if (error.message.includes('Out of memory')) {
        throw new Error('Memory error: Image too large. Please use a smaller image.');
      } else if (error.message.includes('Invalid segmentation result')) {
        throw new Error('Processing error: AI model failed to process the image. Please try a different image.');
      }
    }
    
    throw error;
  }
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Cleanup object URL to prevent memory leaks
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

// Utility function to check if background removal is supported
export const isBackgroundRemovalSupported = async (): Promise<boolean> => {
  try {
    const device = await detectBestDevice();
    return device === 'webgpu' || device === 'wasm';
  } catch {
    return false;
  }
};
