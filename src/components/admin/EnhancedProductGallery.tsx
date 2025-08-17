import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Upload, 
  X, 
  Star, 
  GripVertical, 
  Image as ImageIcon, 
  Plus,
  ExternalLink,
  Copy,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  Search,
  Filter
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  image_status: string;
  match_confidence?: number;
  auto_matched?: boolean;
  created_at: string;
}

interface CachedDriveImage {
  id: string;
  filename: string;
  direct_url: string;
  sku?: string;
  is_linked: boolean;
  linked_product_id?: string;
  file_size?: number;
  mime_type?: string;
}

interface EnhancedProductGalleryProps {
  productId: string;
  productSku?: string;
  productName?: string;
}

export const EnhancedProductGallery = ({ 
  productId, 
  productSku, 
  productName 
}: EnhancedProductGalleryProps) => {
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCandidates, setShowCandidates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkAltText, setBulkAltText] = useState('');

  // Fetch existing product images
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['enhanced-product-images', productId],
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

  // Fetch potential image candidates from cached drive images
  const { data: candidates = [] } = useQuery({
    queryKey: ['drive-image-candidates', productSku],
    queryFn: async () => {
      if (!productSku) return [];
      
      const { data, error } = await supabase
        .from('cached_drive_images')
        .select('*')
        .or(`sku.ilike.%${productSku}%,filename.ilike.%${productSku}%`)
        .eq('is_linked', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CachedDriveImage[];
    },
    enabled: !!productSku && showCandidates,
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${index}.${fileExt}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Create database record
        const altText = bulkAltText || `${productName || 'Product'} image ${images.length + index + 1}`;
        
        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            alt_text: altText,
            is_primary: images.length === 0 && index === 0,
            sort_order: images.length + index,
            image_status: 'active'
          });

        if (dbError) throw dbError;
        return publicUrl;
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: (urls) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
      toast.success(`Successfully uploaded ${urls.length} images`);
      setBulkAltText('');
      setUploadProgress(0);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
      setUploadProgress(0);
    },
  });

  // Link candidate image mutation
  const linkCandidateMutation = useMutation({
    mutationFn: async (candidate: CachedDriveImage) => {
      const altText = candidate.filename.replace(/\.[^/.]+$/, '') || `${productName || 'Product'} image`;
      
      const { error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: candidate.direct_url,
          alt_text: altText,
          is_primary: images.length === 0,
          sort_order: images.length,
          image_status: 'active',
          match_confidence: 85,
          auto_matched: false
        });

      if (error) throw error;

      // Mark candidate as linked
      await supabase
        .from('cached_drive_images')
        .update({
          is_linked: true,
          linked_product_id: productId,
          linked_at: new Date().toISOString()
        })
        .eq('id', candidate.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
      queryClient.invalidateQueries({ queryKey: ['drive-image-candidates', productSku] });
      toast.success('Image linked successfully');
    },
    onError: (error) => {
      console.error('Link error:', error);
      toast.error('Failed to link image');
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const image = images.find(img => img.id === imageId);
      if (!image) throw new Error('Image not found');

      // Extract file path from URL
      const urlParts = image.image_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'product-images');
      
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        await supabase.storage.from('product-images').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
      toast.success('Image deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      const imagesToDelete = images.filter(img => imageIds.includes(img.id));
      
      // Delete from storage
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
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
      setSelectedImages([]);
      toast.success('Images deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete images');
    },
  });

  // Set primary image mutation
  const setPrimaryImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // Remove primary from all images
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
      
      // Set new primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
      toast.success('Primary image updated');
    },
  });

  // Reorder images
  const reorderImagesMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-images', productId] });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await bulkUploadMutation.mutateAsync(files);
      setUploadProgress(100);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleImageSelect = (imageId: string, checked: boolean) => {
    if (checked) {
      setSelectedImages(prev => [...prev, imageId]);
    } else {
      setSelectedImages(prev => prev.filter(id => id !== imageId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedImages(images.map(img => img.id));
    } else {
      setSelectedImages([]);
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

    reorderImagesMutation.mutate(updates);
  }, [images, reorderImagesMutation]);

  const filteredImages = images.filter(image => {
    if (filterStatus !== 'all' && image.image_status !== filterStatus) return false;
    if (searchQuery && !image.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Image URL copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Gallery ({images.length} images)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCandidates(!showCandidates)}
              >
                <Search className="h-4 w-4 mr-2" />
                Find Images
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              {showCandidates && <TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="gallery" className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedImages.length === images.length && images.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">
                    {selectedImages.length > 0 ? `${selectedImages.length} selected` : 'Select all'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search images..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedImages.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Bulk Actions ({selectedImages.length} selected)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => bulkDeleteMutation.mutate(selectedImages)}
                        disabled={bulkDeleteMutation.isPending}
                      >
                        Delete Selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedImages([])}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Images Grid/List */}
              {isLoading ? (
                <div className="text-center py-8">Loading images...</div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images found</p>
                  <p className="text-sm">Upload images or find them from the scanned bucket</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="images">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={
                          viewMode === 'grid'
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                            : "space-y-4"
                        }
                      >
                        {filteredImages.map((image, index) => (
                          <Draggable key={image.id} draggableId={image.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`relative border rounded-lg overflow-hidden ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                } ${viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''}`}
                              >
                                <div className={viewMode === 'grid' ? 'aspect-square relative' : 'w-20 h-20 relative flex-shrink-0'}>
                                  <img
                                    src={image.image_url}
                                    alt={image.alt_text || 'Product image'}
                                    className="w-full h-full object-cover"
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
                                </div>

                                <div className={viewMode === 'grid' ? 'p-4' : 'flex-1'}>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium truncate">
                                      {image.alt_text || 'No alt text'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Order: {image.sort_order}</span>
                                      {image.auto_matched && (
                                        <Badge variant="outline" className="text-xs">
                                          Auto-matched
                                        </Badge>
                                      )}
                                      {image.match_confidence && (
                                        <Badge variant="secondary" className="text-xs">
                                          {image.match_confidence}%
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {!image.is_primary && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPrimaryImageMutation.mutate(image.id)}
                                          disabled={setPrimaryImageMutation.isPending}
                                        >
                                          <Star className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyImageUrl(image.image_url)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(image.image_url, '_blank')}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
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
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-alt-text">Default Alt Text (optional)</Label>
                  <Input
                    id="bulk-alt-text"
                    value={bulkAltText}
                    onChange={(e) => setBulkAltText(e.target.value)}
                    placeholder="Enter default alt text for uploaded images"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If not provided, alt text will be auto-generated based on product name and image order.
                  </p>
                </div>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="bulk-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports multiple images. JPEG, PNG, WebP, GIF formats accepted.
                    </p>
                  </label>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      Uploading images... {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {showCandidates && (
              <TabsContent value="candidates" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Found {candidates.length} potential images for SKU: {productSku}
                </div>
                
                {candidates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No candidate images found</p>
                    <p className="text-sm">Try scanning the image bucket again or check the SKU matching</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidates.map((candidate) => (
                      <Card key={candidate.id} className="overflow-hidden">
                        <div className="aspect-square bg-muted relative">
                          <img
                            src={candidate.direct_url}
                            alt={candidate.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium truncate">{candidate.filename}</p>
                            {candidate.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {candidate.sku}</p>
                            )}
                            {candidate.file_size && (
                              <p className="text-xs text-muted-foreground">
                                Size: {(candidate.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                            <Button
                              size="sm"
                              onClick={() => linkCandidateMutation.mutate(candidate)}
                              disabled={linkCandidateMutation.isPending}
                              className="w-full"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Link to Product
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};