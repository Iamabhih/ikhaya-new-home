import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, X, Star, GripVertical, Image as ImageIcon } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ImageOptimizer } from "./ImageOptimizer";
import { BulkImageManager } from "./BulkImageManager";

interface ProductImageManagerProps {
  productId: string;
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export const ProductImageManager = ({ productId }: ProductImageManagerProps) => {
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [altTexts, setAltTexts] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [optimizedFiles, setOptimizedFiles] = useState<{ [key: string]: File }>({});

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return data as ProductImage[];
    },
    enabled: !!productId,
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Save image record to database
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: publicUrl,
          alt_text: altTexts[file.name] || file.name.replace(/\.[^/.]+$/, ""),
          is_primary: images.length === 0,
          sort_order: images.length,
        });

      if (dbError) throw dbError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (image: ProductImage) => {
      // Extract file path from URL - improved parsing
      const urlParts = image.image_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'product-images');
      
      if (bucketIndex === -1) {
        throw new Error('Invalid image URL format');
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', image.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      toast.success('Image deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      const imagesToDelete = images.filter(img => imageIds.includes(img.id));
      
      // Delete from storage first
      for (const image of imagesToDelete) {
        const urlParts = image.image_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'product-images');
        
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          await supabase.storage.from('product-images').remove([filePath]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .in('id', imageIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      setSelectedImages([]);
    },
  });

  const updateImageOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('product_images')
          .update({ sort_order })
          .eq('id', id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Failed to update image order');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });

  const setPrimaryImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
      
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      toast.success('Primary image updated');
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 52428800; // 50MB
      
      if (!isValidType) {
        toast.error(`${file.name}: Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: File too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
    
    const newAltTexts: { [key: string]: string } = {};
    validFiles.forEach(file => {
      newAltTexts[file.name] = file.name.replace(/\.[^/.]+$/, "");
    });
    setAltTexts(newAltTexts);
  };

  const handleOptimizedFile = (originalFileName: string, optimizedFile: File) => {
    setOptimizedFiles(prev => ({
      ...prev,
      [originalFileName]: optimizedFile
    }));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileToUpload = optimizedFiles[file.name] || file;
        await uploadImageMutation.mutateAsync(fileToUpload);
      }
      setSelectedFiles([]);
      setAltTexts({});
      setOptimizedFiles({});
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (files: File[]) => {
    for (const file of files) {
      await uploadImageMutation.mutateAsync(file);
    }
  };

  const handleBulkDelete = async (imageIds: string[]) => {
    await bulkDeleteMutation.mutateAsync(imageIds);
  };

  const handleImageSelect = (imageId: string, checked: boolean) => {
    if (checked) {
      setSelectedImages(prev => [...prev, imageId]);
    } else {
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    updateImageOrderMutation.mutate(updates);
  }, [images, updateImageOrderMutation]);

  if (isLoading) {
    return <div className="text-center py-8">Loading images...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Product Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Actions */}
        <BulkImageManager
          selectedImages={selectedImages}
          onBulkDelete={handleBulkDelete}
          onBulkUpload={handleBulkUpload}
          onClearSelection={() => setSelectedImages([])}
        />

        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-upload">Upload Images</Label>
            <Input
              id="image-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported formats: JPEG, PNG, WebP, GIF. Maximum size: 50MB per file. Images will be automatically optimized.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Selected Files ({selectedFiles.length}):</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded">
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <div className="flex-1">
                    <Label htmlFor={`alt-${index}`} className="text-xs">Alt Text</Label>
                    <Input
                      id={`alt-${index}`}
                      value={altTexts[file.name] || ''}
                      onChange={(e) => setAltTexts(prev => ({
                        ...prev,
                        [file.name]: e.target.value
                      }))}
                      className="mt-1"
                      placeholder="Describe the image..."
                    />
                  </div>
                  <ImageOptimizer
                    file={file}
                    onOptimized={(optimizedFile) => handleOptimizedFile(file.name, optimizedFile)}
                  />
                </div>
              ))}
              <Button 
                onClick={handleUpload} 
                disabled={uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </div>

        {/* Existing Images */}
        {images.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Current Images ({images.length})</h4>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="images">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {images.map((image, index) => (
                      <Draggable key={image.id} draggableId={image.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative border rounded-lg overflow-hidden ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="aspect-square relative bg-[hsl(var(--product-image-bg))]">
                              <img
                                src={image.image_url}
                                alt={image.alt_text || 'Product image'}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                              
                              <div className="absolute top-2 left-2 flex items-center gap-2">
                                <Checkbox
                                  checked={selectedImages.includes(image.id)}
                                  onCheckedChange={(checked) => handleImageSelect(image.id, checked as boolean)}
                                  className="bg-background/80"
                                />
                                <div
                                  {...provided.dragHandleProps}
                                  className="p-1 bg-background/80 rounded cursor-move"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </div>

                              {image.is_primary && (
                                <Badge className="absolute top-2 right-2 bg-yellow-500">
                                  <Star className="h-3 w-3 mr-1" />
                                  Primary
                                </Badge>
                              )}

                              <div className="absolute bottom-2 right-2 flex gap-1">
                                {!image.is_primary && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setPrimaryImageMutation.mutate(image.id)}
                                    disabled={setPrimaryImageMutation.isPending}
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteImageMutation.mutate(image)}
                                  disabled={deleteImageMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="p-3">
                              <p className="text-sm font-medium truncate">
                                {image.alt_text || 'No alt text'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Sort order: {image.sort_order}
                              </p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {images.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No images uploaded yet</p>
            <p className="text-sm">Upload images above to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
