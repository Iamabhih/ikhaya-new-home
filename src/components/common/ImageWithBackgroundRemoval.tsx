import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, Scissors, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

interface ImageWithBackgroundRemovalProps {
  onProcessed?: (blob: Blob) => void;
  className?: string;
}

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

const removeBackground = async (imageElement: HTMLImageElement, onProgress?: (progress: number) => void): Promise<Blob> => {
  try {
    console.log('Starting background removal process...');
    onProgress?.(10);
    
    const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    });
    onProgress?.(30);
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    onProgress?.(40);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('Image converted to base64');
    onProgress?.(50);
    
    // Process the image with the segmentation model
    console.log('Processing with segmentation model...');
    const result = await segmenter(imageData);
    onProgress?.(80);
    
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    // Create a new canvas for the masked image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the mask
    const outputImageData = outputCtx.getImageData(
      0, 0,
      outputCanvas.width,
      outputCanvas.height
    );
    const data = outputImageData.data;
    
    // Apply inverted mask to alpha channel
    for (let i = 0; i < result[0].mask.data.length; i++) {
      // Invert the mask value (1 - value) to keep the subject instead of the background
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Mask applied successfully');
    onProgress?.(90);
    
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

const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

export const ImageWithBackgroundRemoval = ({ onProcessed, className }: ImageWithBackgroundRemovalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [processedPreview, setProcessedPreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setOriginalPreview(URL.createObjectURL(file));
    setProcessedPreview("");
    setProcessedBlob(null);
    setProgress(0);
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const imageElement = await loadImage(selectedFile);
      const processedBlob = await removeBackground(imageElement, setProgress);
      
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedPreview(processedUrl);
      setProcessedBlob(processedBlob);
      
      onProcessed?.(processedBlob);
      
      toast({
        title: "Background removed successfully",
        description: "Your image has been processed",
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing failed",
        description: "Failed to remove background. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !selectedFile) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = `${selectedFile.name.split('.')[0]}_no_bg.png`;
    link.click();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="w-5 h-5" />
          Background Removal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => document.getElementById('bg-removal-upload')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Select Image
          </Button>
          <input
            id="bg-removal-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile && (
            <span className="text-sm text-muted-foreground truncate">
              {selectedFile.name}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing image...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        {selectedFile && (
          <div className="flex gap-2">
            <Button
              onClick={handleRemoveBackground}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Scissors className="w-4 h-4" />
              )}
              Remove Background
            </Button>
            {processedBlob && (
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
          </div>
        )}

        {/* Image Previews */}
        {(originalPreview || processedPreview) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {originalPreview && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Original</h4>
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={originalPreview}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            {processedPreview && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Background Removed</h4>
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-muted via-background to-muted">
                  <img
                    src={processedPreview}
                    alt="Processed"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
