import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, Star, GripVertical, Image as ImageIcon } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

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
      // In a real implementation, you would upload to a storage service
      // For now, we'll use a placeholder URL
      const imageUrl = `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop`;
      
      const { error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: altTexts[file.name] || file.name,
          is_primary: images.length === 0,
          sort_order: images.length,
        });
      
      if (error) throw error;
      return imageUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      setSelectedFiles([]);
      setAltTexts({});
      toast.success('Image uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload image');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
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

  const updateImageOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const { error } = await supabase
        .from('product_images')
        .upsert(updates, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });

  const setPrimaryImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // First, set all images to non-primary
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
      
      // Then set the selected image as primary
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
    setSelectedFiles(files);
    
    // Initialize alt text for each file
    const newAltTexts: { [key: string]: string } = {};
    files.forEach(file => {
      newAltTexts[file.name] = file.name.replace(/\.[^/.]+$/, "");
    });
    setAltTexts(newAltTexts);
  };

  const handleUpload = () => {
    selectedFiles.forEach(file => {
      uploadImageMutation.mutate(file);
    });
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
        {/* Upload Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="image-upload">Upload Images</Label>
            <Input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Selected Files:</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded">
                  <span className="text-sm font-medium">{file.name}</span>
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
                </div>
              ))}
              <Button onClick={handleUpload} disabled={uploadImageMutation.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
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
                            <div className="aspect-square relative">
                              <img
                                src={image.image_url}
                                alt={image.alt_text || 'Product image'}
                                className="w-full h-full object-cover"
                              />
                              
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="absolute top-2 left-2 p-1 bg-background/80 rounded cursor-move"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>

                              {/* Primary Badge */}
                              {image.is_primary && (
                                <Badge className="absolute top-2 right-2 bg-yellow-500">
                                  <Star className="h-3 w-3 mr-1" />
                                  Primary
                                </Badge>
                              )}

                              {/* Action Buttons */}
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
                                  onClick={() => deleteImageMutation.mutate(image.id)}
                                  disabled={deleteImageMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Image Info */}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
