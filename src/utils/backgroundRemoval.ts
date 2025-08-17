import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

// Enhanced configuration for different image types
const MODEL_CONFIGS = {
  general: {
    model: 'Xenova/segformer-b2-finetuned-ade-512-512',
    device: 'webgpu',
    dtype: 'fp16'
  },
  portrait: {
    model: 'Xenova/detr-resnet-50-panoptic',
    device: 'webgpu', 
    dtype: 'fp16'
  },
  product: {
    model: 'Xenova/segformer-b0-finetuned-ade-512-512',
    device: 'webgpu',
    dtype: 'fp16'
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

// Enhanced edge refinement using morphological operations
function refineEdges(imageData: ImageData, radius: number = 2): ImageData {
  const { width, height, data } = imageData;
  const refined = new Uint8ClampedArray(data);
  
  // Apply morphological closing to fill small gaps
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      
      if (alpha < 128) { // If pixel is transparent or semi-transparent
        let maxAlpha = 0;
        // Check neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            maxAlpha = Math.max(maxAlpha, data[nIdx + 3]);
          }
        }
        
        // If surrounded by opaque pixels, make this pixel semi-opaque
        if (maxAlpha > 200) {
          refined[idx + 3] = Math.min(255, alpha + 50);
        }
      }
    }
  }
  
  return new ImageData(refined, width, height);
}

// Gaussian blur for smooth edges
function applyGaussianBlur(imageData: ImageData, sigma: number = 1.0): ImageData {
  const { width, height, data } = imageData;
  const blurred = new Uint8ClampedArray(data);
  const kernel = generateGaussianKernel(sigma);
  const kernelSize = kernel.length;
  const radius = Math.floor(kernelSize / 2);
  
  // Blur only the alpha channel for smooth edges
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      let weightedSum = 0;
      let weightSum = 0;
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x + kx - radius;
          const py = y + ky - radius;
          const pIdx = (py * width + px) * 4;
          const weight = kernel[ky][kx];
          
          weightedSum += data[pIdx + 3] * weight;
          weightSum += weight;
        }
      }
      
      blurred[idx + 3] = Math.round(weightedSum / weightSum);
    }
  }
  
  return new ImageData(blurred, width, height);
}

function generateGaussianKernel(sigma: number): number[][] {
  const size = Math.ceil(sigma * 3) * 2 + 1;
  const kernel: number[][] = [];
  const center = Math.floor(size / 2);
  let sum = 0;
  
  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[y][x] = value;
      sum += value;
    }
  }
  
  // Normalize kernel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }
  
  return kernel;
}

// Enhanced background removal with better object preservation
export const removeBackground = async (
  imageElement: HTMLImageElement, 
  options: {
    imageType?: 'general' | 'portrait' | 'product';
    quality?: 'fast' | 'balanced' | 'high';
    preserveDetails?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<Blob> => {
  const { 
    imageType = 'product', 
    quality = 'balanced', 
    preserveDetails = true,
    onProgress 
  } = options;
  
  try {
    console.log('Starting enhanced background removal process...');
    onProgress?.(5);
    
    const config = MODEL_CONFIGS[imageType];
    console.log(`Using ${imageType} model: ${config.model}`);
    
    const segmenter = await pipeline('image-segmentation', config.model, {
      device: config.device as 'webgpu',
      dtype: config.dtype as 'fp16',
    });
    
    onProgress?.(20);
    
    // Convert HTMLImageElement to canvas with enhanced preprocessing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    
    onProgress?.(30);
    
    // Enhanced preprocessing for better segmentation
    if (quality === 'high') {
      // Apply slight sharpening to enhance edges
      ctx.filter = 'contrast(1.1) brightness(1.05)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', quality === 'fast' ? 0.7 : 0.9);
    console.log('Image converted to base64 with enhanced preprocessing');
    
    onProgress?.(40);
    
    // Process the image with the segmentation model
    console.log('Processing with enhanced segmentation model...');
    const result = await segmenter(imageData);
    
    onProgress?.(70);
    
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid segmentation result');
    }
    
    // Find the best mask for the main object
    let bestMask = null;
    let bestScore = 0;
    
    for (const segment of result) {
      if (segment.mask && segment.score > bestScore) {
        // Look for person, object, or foreground-related labels
        const label = segment.label?.toLowerCase() || '';
        const isMainObject = ['person', 'object', 'foreground', 'human', 'product'].some(term => 
          label.includes(term)
        );
        
        if (isMainObject || segment.score > 0.8) {
          bestMask = segment.mask;
          bestScore = segment.score;
        }
      }
    }
    
    // Fallback to first mask if no specific object found
    if (!bestMask && result[0]?.mask) {
      bestMask = result[0].mask;
    }
    
    if (!bestMask) {
      throw new Error('No valid mask found in segmentation result');
    }
    
    onProgress?.(80);
    
    // Create a new canvas for the enhanced masked image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the enhanced mask with object preservation
    let outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = outputImageData.data;
    
    // Enhanced masking with edge preservation
    for (let i = 0; i < bestMask.data.length; i++) {
      const maskValue = bestMask.data[i];
      const pixelIdx = i * 4;
      
      if (quality === 'high' && preserveDetails) {
        // Use soft masking for better edge quality
        const alpha = Math.round(maskValue * 255);
        data[pixelIdx + 3] = alpha;
      } else {
        // Standard binary masking
        const alpha = maskValue > 0.5 ? 255 : 0;
        data[pixelIdx + 3] = alpha;
      }
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    
    // Apply post-processing enhancements
    if (preserveDetails && quality !== 'fast') {
      outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      
      // Refine edges
      outputImageData = refineEdges(outputImageData, quality === 'high' ? 3 : 2);
      
      // Apply slight blur for smooth edges
      if (quality === 'high') {
        outputImageData = applyGaussianBlur(outputImageData, 0.8);
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);
    }
    
    onProgress?.(95);
    
    console.log('Enhanced mask applied successfully with object preservation');
    
    // Convert canvas to blob with optimal compression
    const compressionQuality = quality === 'high' ? 1.0 : quality === 'balanced' ? 0.95 : 0.85;
    
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created enhanced final blob');
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        compressionQuality
      );
    });
  } catch (error) {
    console.error('Error in enhanced background removal:', error);
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
