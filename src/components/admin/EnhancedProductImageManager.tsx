import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  Archive, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  Trash2,
  Upload
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageOptimizer } from './ImageOptimizer';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  image_status: 'draft' | 'active' | 'archived';
  match_confidence: number;
  auto_matched: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface EnhancedProductImageManagerProps {
  productId: string;
}

export const EnhancedProductImageManager: React.FC<EnhancedProductImageManagerProps> = ({
  productId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [altTexts, setAltTexts] = useState<{ [key: string]: string }>({});
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: images, isLoading } = useQuery({
    queryKey: ['product-images-enhanced', productId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (statusFilter !== 'all') {
        query = query.eq('image_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductImage[];
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, altText }: { file: File; altText: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const maxSortOrder = Math.max(...(images?.map(img => img.sort_order) || [0]));
      
      const { error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: publicUrl,
          alt_text: altText,
          sort_order: maxSortOrder + 1,
          image_status: 'active',
          match_confidence: 100,
          auto_matched: false
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images-enhanced'] });
      setSelectedFiles([]);
      setAltTexts({});
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateImageStatusMutation = useMutation({
    mutationFn: async ({ imageId, status }: { imageId: string; status: string }) => {
      const { error } = await supabase
        .from('product_images')
        .update({ 
          image_status: status,
          reviewed_by: status !== 'draft' ? (await supabase.auth.getUser()).data.user?.id : null,
          reviewed_at: status !== 'draft' ? new Date().toISOString() : null
        })
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images-enhanced'] });
      toast({
        title: "Success",
        description: "Image status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setPrimaryImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // First, remove primary status from all images
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
      queryClient.invalidateQueries({ queryKey: ['product-images-enhanced'] });
      toast({
        title: "Success",
        description: "Primary image updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const image = images?.find(img => img.id === imageId);
      if (image) {
        // Extract file path from URL
        const urlParts = image.image_url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        
        // Delete from storage
        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images-enhanced'] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    const newAltTexts: { [key: string]: string } = {};
    files.forEach((file, index) => {
      newAltTexts[`${index}`] = file.name.split('.')[0];
    });
    setAltTexts(newAltTexts);
  };

  const handleUpload = async () => {
    for (let i = 0; i < selectedFiles.length; i++) {
      await uploadImageMutation.mutateAsync({
        file: selectedFiles[i],
        altText: altTexts[`${i}`] || selectedFiles[i].name
      });
    }
  };

  const getStatusBadge = (status: string, autoMatched: boolean) => {
    const badge = (() => {
      switch (status) {
        case 'active':
          return <Badge variant="default">Active</Badge>;
        case 'draft':
          return <Badge variant="secondary">Draft</Badge>;
        case 'archived':
          return <Badge variant="outline">Archived</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    })();

    return (
      <div className="flex gap-1">
        {badge}
        {autoMatched && <Badge variant="outline" className="text-xs">Auto</Badge>}
      </div>
    );
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence === 100) return null;
    if (confidence >= 80) return <Badge variant="default" className="text-xs">High ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge variant="secondary" className="text-xs">Med ({confidence}%)</Badge>;
    return <Badge variant="outline" className="text-xs">Low ({confidence}%)</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Enhanced Product Image Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manage" className="space-y-4">
          <TabsList>
            <TabsTrigger value="manage">Manage Images</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Images</label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-4">
                  {selectedFiles.map((file, idx) => (
                    <ImageOptimizer
                      key={idx}
                      file={file}
                      onOptimized={(optimizedFile) => {
                        setSelectedFiles(prev => prev.map((f, i) => i === idx ? optimizedFile : f));
                      }}
                    />
                  ))}
                  
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex gap-4 items-center p-4 border rounded">
                      <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <Input
                          placeholder="Alt text"
                          value={altTexts[`${index}`] || ''}
                          onChange={(e) => setAltTexts(prev => ({
                            ...prev,
                            [`${index}`]: e.target.value
                          }))}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={handleUpload}
                    disabled={uploadImageMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex gap-4 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Images</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading images...</div>
            ) : images?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No images found. Upload some images to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images?.map((image) => (
                  <Card key={image.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      <img
                        src={image.image_url}
                        alt={image.alt_text || 'Product image'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute top-2 right-2 space-y-1">
                        {getStatusBadge(image.image_status, image.auto_matched)}
                        {getConfidenceBadge(image.match_confidence)}
                      </div>
                      {image.is_primary && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Input
                          placeholder="Alt text"
                          value={image.alt_text || ''}
                          onChange={(e) => {
                            // Update alt text functionality would go here
                          }}
                          className="text-sm"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          {!image.is_primary && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPrimaryImageMutation.mutate(image.id)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Set Primary
                            </Button>
                          )}

                          {image.image_status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateImageStatusMutation.mutate({
                                imageId: image.id,
                                status: 'archived'
                              })}
                            >
                              <Archive className="h-3 w-3 mr-1" />
                              Archive
                            </Button>
                          )}

                          {image.image_status === 'archived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateImageStatusMutation.mutate({
                                imageId: image.id,
                                status: 'active'
                              })}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteImageMutation.mutate(image.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};