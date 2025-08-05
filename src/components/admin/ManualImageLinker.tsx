import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Link, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Zap,
  Target,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface CachedImage {
  id: string;
  sku?: string;
  filename: string;
  drive_id: string;
  direct_url: string;
  file_size?: number;
  mime_type: string;
  scan_session_id?: string;
  is_linked: boolean;
  linked_product_id?: string;
  linked_at?: string;
  linked_by?: string;
  created_at: string;
  metadata?: any;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  categories?: { name: string };
}

interface LinkingStats {
  totalImages: number;
  linkedImages: number;
  unlinkedImages: number;
  withSku: number;
  recentlyLinked: number;
  linkingRate: number;
}

interface BulkOperation {
  type: 'link' | 'delete' | 'download';
  selectedItems: string[];
  inProgress: boolean;
  progress: number;
  total: number;
}

export const ManualImageLinker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<CachedImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "linked" | "unlinked">("unlinked");
  const [sortBy, setSortBy] = useState<"date" | "size" | "name">("date");
  const [previewImage, setPreviewImage] = useState<CachedImage | null>(null);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);
  const [linkingStats, setLinkingStats] = useState<LinkingStats | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  // Enhanced cached images query with better sorting and filtering
  const { data: cachedImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['cached-drive-images', debouncedSearchTerm, filterStatus, sortBy],
    queryFn: async () => {
      let query = (supabase as any)
        .from('cached_drive_images')
        .select('*');

      // Enhanced filtering
      if (debouncedSearchTerm) {
        query = query.or(`filename.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }

      if (filterStatus === 'linked') {
        query = query.eq('is_linked', true);
      } else if (filterStatus === 'unlinked') {
        query = query.eq('is_linked', false);
      }

      // Enhanced sorting
      switch (sortBy) {
        case 'date':
          query = query.order('created_at', { ascending: false });
          break;
        case 'size':
          query = query.order('file_size', { ascending: false });
          break;
        case 'name':
          query = query.order('filename', { ascending: true });
          break;
      }

      const { data, error } = await query.limit(500); // Increased limit for better UX
      if (error) throw error;
      return data as CachedImage[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Enhanced products query with category information
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-linking', debouncedSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id, 
          name, 
          sku,
          categories(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query.limit(100); // Reasonable limit for dropdown
      if (error) throw error;
      return data as Product[];
    },
  });

  // Enhanced linking statistics
  const { data: statsData } = useQuery({
    queryKey: ['linking-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cached_drive_images')
        .select('is_linked, sku, created_at, linked_at');

      if (error) throw error;

      const totalImages = data.length;
      const linkedImages = data.filter((img: any) => img.is_linked).length;
      const unlinkedImages = totalImages - linkedImages;
      const withSku = data.filter((img: any) => img.sku).length;
      
      // Calculate recently linked (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentlyLinked = data.filter((img: any) => 
        img.linked_at && img.linked_at > oneDayAgo
      ).length;

      const linkingRate = totalImages > 0 ? Math.round((linkedImages / totalImages) * 100) : 0;

      return {
        totalImages,
        linkedImages,
        unlinkedImages,
        withSku,
        recentlyLinked,
        linkingRate
      } as LinkingStats;
    },
    refetchInterval: 60000, // Refresh stats every minute
  });

  // Enhanced bulk linking mutation
  const bulkLinkMutation = useMutation({
    mutationFn: async ({ imageIds, productId }: { imageIds: string[]; productId: string }) => {
      setBulkOperation({
        type: 'link',
        selectedItems: imageIds,
        inProgress: true,
        progress: 0,
        total: imageIds.length
      });

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < imageIds.length; i++) {
        try {
          // Update progress
          setBulkOperation(prev => prev ? { ...prev, progress: i + 1 } : null);

          const imageData = cachedImages.find(img => img.id === imageIds[i]);
          if (!imageData) {
            throw new Error('Image not found');
          }

          const product = products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }

          // Download and upload logic (same as single link)
          const imageResponse = await fetch(imageData.direct_url);
          if (!imageResponse.ok) {
            throw new Error('Failed to download image from Google Drive');
          }

          const imageBlob = await imageResponse.blob();
          const fileExtension = imageData.filename.toLowerCase().includes('.png') ? 'png' : 'jpg';
          const fileName = `${product.sku}_${i + 1}.${fileExtension}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, imageBlob, {
              contentType: imageData.mime_type,
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          // Check for existing images
          const { data: existingImage } = await supabase
            .from('product_images')
            .select('id')
            .eq('product_id', productId)
            .eq('image_url', urlData.publicUrl)
            .single();

          if (!existingImage) {
            const { data: allExistingImages } = await supabase
              .from('product_images')
              .select('is_primary')
              .eq('product_id', productId);

            const isPrimary = !allExistingImages?.some(img => img.is_primary);

            const { error: insertError } = await supabase
              .from('product_images')
              .insert({
                product_id: productId,
                image_url: urlData.publicUrl,
                alt_text: `${product.name} product image`,
                is_primary: isPrimary,
                sort_order: allExistingImages?.length || 0
              });

            if (insertError) throw insertError;
          }

          // Mark as linked
          const { error: markError } = await (supabase as any)
            .from('cached_drive_images')
            .update({
              is_linked: true,
              linked_product_id: productId,
              linked_at: new Date().toISOString(),
              linked_by: (await supabase.auth.getUser()).data.user?.id
            })
            .eq('id', imageIds[i]);

          if (markError) throw markError;

          successCount++;
          results.push({ imageId: imageIds[i], success: true });

        } catch (error) {
          errorCount++;
          results.push({ 
            imageId: imageIds[i], 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }

        // Small delay to prevent overwhelming the system
        if (i < imageIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setBulkOperation(null);
      return { results, successCount, errorCount };
    },
    onSuccess: (data) => {
      toast.success(`Bulk linking completed: ${data.successCount} successful, ${data.errorCount} failed`);
      queryClient.invalidateQueries({ queryKey: ['cached-drive-images'] });
      queryClient.invalidateQueries({ queryKey: ['linking-stats'] });
      setSelectedImages([]);
      setSelectedProduct(null);
    },
    onError: (error) => {
      setBulkOperation(null);
      toast.error(`Bulk linking failed: ${error.message}`);
    },
  });

  // Enhanced single image linking mutation
  const linkImageMutation = useMutation({
    mutationFn: async ({ imageId, productId }: { imageId: string; productId: string }) => {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const { data: imageData, error: imageError } = await (supabase as any)
        .from('cached_drive_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (imageError) throw imageError;

      // Enhanced download with retry logic
      let imageResponse;
      let retries = 3;
      while (retries > 0) {
        try {
          imageResponse = await fetch(imageData.direct_url);
          if (imageResponse.ok) break;
          throw new Error(`HTTP ${imageResponse.status}`);
        } catch (error) {
          retries--;
          if (retries === 0) throw new Error('Failed to download image from Google Drive after 3 attempts');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      const imageBlob = await imageResponse.blob();
      
      // Enhanced file naming with conflict resolution
      const fileExtension = imageData.filename.toLowerCase().includes('.png') ? 'png' : 'jpg';
      let fileName = `${product.sku}.${fileExtension}`;
      
      // Check if file already exists and create unique name if needed
      const { data: existingFile } = await supabase.storage
        .from('product-images')
        .list('', { search: fileName });

      if (existingFile && existingFile.length > 0) {
        const timestamp = Date.now();
        fileName = `${product.sku}_${timestamp}.${fileExtension}`;
      }

      // Upload with enhanced error handling
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageBlob, {
          contentType: imageData.mime_type,
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Enhanced duplicate check
      const { data: existingImage } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', productId)
        .eq('image_url', urlData.publicUrl)
        .single();

      if (existingImage) {
        // Image already exists, just mark cached image as linked
        await (supabase as any)
          .from('cached_drive_images')
          .update({
            is_linked: true,
            linked_product_id: productId,
            linked_at: new Date().toISOString(),
            linked_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', imageId);
        
        return { product, image: imageData, wasExisting: true };
      }

      // Check if product already has a primary image
      const { data: allExistingImages } = await supabase
        .from('product_images')
        .select('is_primary')
        .eq('product_id', productId);

      const isPrimary = !allExistingImages?.some(img => img.is_primary);

      // Create new product image record
      const { error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: urlData.publicUrl,
          alt_text: `${product.name} product image`,
          is_primary: isPrimary,
          sort_order: allExistingImages?.length || 0
        });

      if (insertError) throw insertError;

      // Mark cached image as linked
      const { error: markError } = await (supabase as any)
        .from('cached_drive_images')
        .update({
          is_linked: true,
          linked_product_id: productId,
          linked_at: new Date().toISOString(),
          linked_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', imageId);

      if (markError) throw markError;

      return { product, image: imageData, wasExisting: false };
    },
    onSuccess: (data) => {
      if (data.wasExisting) {
        toast.success(`Image was already linked to ${data.product.name}, marked as linked in cache`);
      } else {
        toast.success(`Successfully linked image to ${data.product.name}`);
      }
      queryClient.invalidateQueries({ queryKey: ['cached-drive-images'] });
      queryClient.invalidateQueries({ queryKey: ['linking-stats'] });
      setSelectedProduct(null);
      setSelectedImage(null);
    },
    onError: (error) => {
      toast.error(`Failed to link image: ${error.message}`);
    },
  });

  // Enhanced bulk delete mutation
  const deleteImagesMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      setBulkOperation({
        type: 'delete',
        selectedItems: imageIds,
        inProgress: true,
        progress: 0,
        total: imageIds.length
      });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < imageIds.length; i++) {
        try {
          setBulkOperation(prev => prev ? { ...prev, progress: i + 1 } : null);

          const { error } = await (supabase as any)
            .from('cached_drive_images')
            .delete()
            .eq('id', imageIds[i]);

          if (error) throw error;
          successCount++;
        } catch (error) {
          errorCount++;
        }

        if (i < imageIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setBulkOperation(null);
      return { successCount, errorCount };
    },
    onSuccess: (data) => {
      toast.success(`Deleted ${data.successCount} images from cache`);
      queryClient.invalidateQueries({ queryKey: ['cached-drive-images'] });
      queryClient.invalidateQueries({ queryKey: ['linking-stats'] });
      setSelectedImages([]);
    },
    onError: (error) => {
      setBulkOperation(null);
      toast.error(`Failed to delete images: ${error.message}`);
    },
  });

  // Enhanced handlers
  const handleLinkImage = useCallback(() => {
    if (selectedImage && selectedProduct) {
      linkImageMutation.mutate({
        imageId: selectedImage.id,
        productId: selectedProduct.id
      });
    }
  }, [selectedImage, selectedProduct, linkImageMutation]);

  const handleBulkLink = useCallback(() => {
    if (selectedImages.length > 0 && selectedProduct) {
      bulkLinkMutation.mutate({
        imageIds: selectedImages,
        productId: selectedProduct.id
      });
    }
  }, [selectedImages, selectedProduct, bulkLinkMutation]);

  const handleBulkDelete = useCallback(() => {
    if (selectedImages.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedImages.length} images from cache?`)) {
        deleteImagesMutation.mutate(selectedImages);
      }
    }
  }, [selectedImages, deleteImagesMutation]);

  const handleImageSelect = useCallback((imageId: string, isSelected: boolean) => {
    setSelectedImages(prev => 
      isSelected 
        ? [...prev, imageId]
        : prev.filter(id => id !== imageId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const unlinkedImages = cachedImages.filter(img => !img.is_linked);
    setSelectedImages(unlinkedImages.map(img => img.id));
  }, [cachedImages]);

  const handleClearSelection = useCallback(() => {
    setSelectedImages([]);
  }, []);

  // Enhanced computed values
  const filteredImages = useMemo(() => {
    return cachedImages.filter(image => {
      if (filterStatus === 'linked') return image.is_linked;
      if (filterStatus === 'unlinked') return !image.is_linked;
      return true;
    });
  }, [cachedImages, filterStatus]);

  const selectedUnlinkedImages = useMemo(() => {
    return selectedImages.filter(id => {
      const image = cachedImages.find(img => img.id === id);
      return image && !image.is_linked;
    });
  }, [selectedImages, cachedImages]);

  // Update stats when data changes
  useEffect(() => {
    if (statsData) {
      setLinkingStats(statsData);
    }
  }, [statsData]);

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Enhanced Manual Image Linking
          </CardTitle>
          <CardDescription>
            Advanced manual review and linking of images discovered from Google Drive scanning with bulk operations and enhanced filtering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enhanced Stats Grid */}
          {linkingStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-xl font-bold">{linkingStats.totalImages.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Images</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-xl font-bold text-green-600">{linkingStats.linkedImages.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Linked</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-xl font-bold text-orange-600">{linkingStats.unlinkedImages.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Unlinked</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{linkingStats.withSku.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">With SKU</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{linkingStats.recentlyLinked.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Recent (24h)</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{linkingStats.linkingRate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          )}

          {/* Enhanced Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Images</SelectItem>
                <SelectItem value="unlinked">Unlinked Only</SelectItem>
                <SelectItem value="linked">Linked Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="size">File Size</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Operations */}
          {selectedImages.length > 0 && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{selectedImages.length} images selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleClearSelection}>
                      Clear
                    </Button>
                    {selectedUnlinkedImages.length > 0 && selectedProduct && (
                      <Button 
                        size="sm" 
                        onClick={handleBulkLink}
                        disabled={bulkLinkMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Link className="h-3 w-3" />
                        Link to {selectedProduct.name}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={handleBulkDelete}
                      disabled={deleteImagesMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
                {bulkOperation && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{bulkOperation.type === 'link' ? 'Linking' : 'Deleting'} images...</span>
                      <span>{bulkOperation.progress}/{bulkOperation.total}</span>
                    </div>
                    <Progress value={(bulkOperation.progress / bulkOperation.total) * 100} className="h-2" />
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Cached Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Cached Images ({filteredImages.length.toLocaleString()})
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleSelectAll}
                  disabled={filteredImages.filter(img => !img.is_linked).length === 0}
                >
                  Select All Unlinked
                </Button>
                <Button size="sm" variant="outline" onClick={() => refetchImages()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Images discovered from Google Drive scans with enhanced filtering and bulk operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {imagesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading cached images...
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cached images found. Run a Google Drive migration to populate this list.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredImages.map((image) => (
                    <div
                      key={image.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedImage?.id === image.id
                          ? 'border-primary bg-primary/5'
                          : selectedImages.includes(image.id)
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-950'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedImages.includes(image.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleImageSelect(image.id, e.target.checked);
                            }}
                            className="mt-1"
                            disabled={image.is_linked}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{image.filename}</p>
                              {image.is_linked ? (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Linked
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Unlinked
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {image.sku && <p>SKU: {image.sku}</p>}
                              <p>Type: {image.mime_type}</p>
                              <p>Size: {image.file_size ? Math.round(image.file_size / 1024) + ' KB' : 'Unknown'}</p>
                              <p>Scanned: {new Date(image.created_at).toLocaleDateString()}</p>
                              {image.linked_at && (
                                <p>Linked: {new Date(image.linked_at).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(image);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(image.direct_url, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          {!image.is_linked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove this image from cache?')) {
                                  deleteImagesMutation.mutate([image.id]);
                                }
                              }}
                              disabled={deleteImagesMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Enhanced Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Select a product to link with the selected image(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {productsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      {product.categories?.name && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {product.categories.name}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Link Action */}
      {((selectedImage && selectedProduct && !selectedImage.is_linked) || (selectedUnlinkedImages.length > 0 && selectedProduct)) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to link:</p>
                {selectedImage && selectedUnlinkedImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedImage.filename} → {selectedProduct.name} ({selectedProduct.sku})
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedUnlinkedImages.length} images → {selectedProduct.name} ({selectedProduct.sku})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {selectedImage && selectedUnlinkedImages.length === 0 ? (
                  <Button
                    onClick={handleLinkImage}
                    disabled={linkImageMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    {linkImageMutation.isPending ? 'Linking...' : 'Link Image'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleBulkLink}
                    disabled={bulkLinkMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {bulkLinkMutation.isPending ? 'Linking...' : `Link ${selectedUnlinkedImages.length} Images`}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.filename}</DialogTitle>
            <DialogDescription>
              Preview of cached image from Google Drive with enhanced details
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img
                src={previewImage.direct_url}
                alt={previewImage.filename}
                className="w-full h-auto max-h-96 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Filename:</strong> {previewImage.filename}
                </div>
                <div>
                  <strong>SKU:</strong> {previewImage.sku || 'Not detected'}
                </div>
                <div>
                  <strong>Type:</strong> {previewImage.mime_type}
                </div>
                <div>
                  <strong>Size:</strong> {previewImage.file_size ? Math.round(previewImage.file_size / 1024) + ' KB' : 'Unknown'}
                </div>
                <div>
                  <strong>Status:</strong> {previewImage.is_linked ? 'Linked' : 'Unlinked'}
                </div>
                <div>
                  <strong>Scanned:</strong> {new Date(previewImage.created_at).toLocaleString()}
                </div>
                {previewImage.linked_at && (
                  <>
                    <div>
                      <strong>Linked:</strong> {new Date(previewImage.linked_at).toLocaleString()}
                    </div>
                    <div>
                      <strong>Linked to:</strong> Product ID {previewImage.linked_product_id}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewImage(null)}>
              Close
            </Button>
            <Button onClick={() => window.open(previewImage?.direct_url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Drive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};