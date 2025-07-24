import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Wand2 } from "lucide-react";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";

interface BannerImageUploadProps {
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  onImageRemove: () => void;
}

export const BannerImageUpload = ({ 
  currentImageUrl, 
  onImageUpload, 
  onImageRemove 
}: BannerImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [removeBackgroundEnabled, setRemoveBackgroundEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      let processedFile: File | Blob = file;

      // Process background removal if enabled
      if (removeBackgroundEnabled) {
        setProcessing(true);
        try {
          toast({
            title: "Processing image",
            description: "Removing background... This may take a moment."
          });
          
          const imageElement = await loadImage(file);
          const processedBlob = await removeBackground(imageElement);
          processedFile = new File([processedBlob], file.name.replace(/\.[^/.]+$/, '.png'), {
            type: 'image/png',
            lastModified: Date.now(),
          });
          
          toast({
            title: "Background removed",
            description: "Image processed successfully"
          });
        } catch (bgError) {
          console.error('Background removal failed:', bgError);
          toast({
            title: "Background removal failed",
            description: "Uploading original image instead",
            variant: "destructive"
          });
          // Continue with original file if background removal fails
        } finally {
          setProcessing(false);
        }
      }

      const fileExt = processedFile instanceof File ? 
        processedFile.name.split('.').pop() : 
        file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, processedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);

      onImageUpload(data.publicUrl);
      
      toast({
        title: "Success",
        description: "Banner image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Banner Image</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="remove-background"
            checked={removeBackgroundEnabled}
            onCheckedChange={setRemoveBackgroundEnabled}
            disabled={uploading || processing}
          />
          <Label htmlFor="remove-background" className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Remove Background (AI)
          </Label>
        </div>
      </div>
      
      {currentImageUrl ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border">
            <img 
              src={currentImageUrl} 
              alt="Banner preview" 
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={triggerFileSelect}
                  disabled={uploading || processing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Replace'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onImageRemove}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${processing ? 'opacity-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-muted-foreground">
              {processing ? <Wand2 className="w-full h-full animate-spin" /> : <ImageIcon className="w-full h-full" />}
            </div>
            <div>
              <p className="text-sm font-medium">
                {processing 
                  ? 'Processing image with AI...' 
                  : dragActive 
                    ? 'Drop your image here' 
                    : 'Upload banner image'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {processing 
                  ? 'This may take a moment depending on image size'
                  : 'Drag and drop or click to browse (max 10MB)'
                }
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={triggerFileSelect}
              disabled={uploading || processing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Recommended dimensions: 1920x600px (16:5 ratio)</p>
        <p>• Supported formats: JPG, PNG, WebP, GIF</p>
        <p>• Maximum file size: 10MB</p>
        {removeBackgroundEnabled && (
          <p>• AI background removal: Uses browser-based AI processing</p>
        )}
      </div>
    </div>
  );
};