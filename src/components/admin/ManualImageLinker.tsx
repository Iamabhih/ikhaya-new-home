import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { CachedImage, ImageLinkingPreview } from "./image-linker/ImageLinkingPreview";
import { LinkingStats, LinkingStatsCard } from "./image-linker/LinkingStatsCard";
import { SearchAndFilterControls } from "./image-linker/SearchAndFilterControls";
import { BulkOperation, Product, BulkOperationsAlert } from "./image-linker/BulkOperationsAlert";
import { ImageSearchPanel } from "./image-linker/ImageSearchPanel";
import { ProductSearchPanel } from "./image-linker/ProductSearchPanel";
import { LinkingActionCard } from "./image-linker/LinkingActionCard";

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

      if (debouncedSearchTerm) {
        query = query.or(`filename.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }

      if (filterStatus === 'linked') {
        query = query.eq('is_linked', true);
      } else if (filterStatus === 'unlinked') {
        query = query.eq('is_linked', false);
      }

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

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as CachedImage[];
    },
    refetchInterval: 30000,
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

      const { data, error } = await query.limit(100);
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
    refetchInterval: 60000,
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
          setBulkOperation(prev => prev ? { ...prev, progress: i + 1 } : null);

          const imageData = cachedImages.find(img => img.id === imageIds[i]);
          if (!imageData) {
            throw new Error('Image not found');
          }

          const product = products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }

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
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const imageBlob = await imageResponse!.blob();
      const fileExtension = imageData.filename.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const fileName = `${product.sku}_${Date.now()}.${fileExtension}`;

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

      const { data: existingImage } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', productId)
        .eq('image_url', urlData.publicUrl)
        .single();

      if (existingImage) {
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

        return { product, image: imageData, wasExisting: true };
      }

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

  // Handlers
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

  // Computed values
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

  useEffect(() => {
    if (statsData) {
      setLinkingStats(statsData);
    }
  }, [statsData]);

  return (
    <div className="space-y-6">
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
          <LinkingStatsCard stats={linkingStats} />

          <SearchAndFilterControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />

          <BulkOperationsAlert
            selectedCount={selectedImages.length}
            selectedUnlinkedCount={selectedUnlinkedImages.length}
            selectedProduct={selectedProduct}
            bulkOperation={bulkOperation}
            isLinking={bulkLinkMutation.isPending}
            isDeleting={deleteImagesMutation.isPending}
            onClearSelection={handleClearSelection}
            onBulkLink={handleBulkLink}
            onBulkDelete={handleBulkDelete}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImageSearchPanel
          images={filteredImages}
          isLoading={imagesLoading}
          selectedImage={selectedImage}
          selectedImages={selectedImages}
          onImageSelect={handleImageSelect}
          onImageClick={setSelectedImage}
          onPreview={setPreviewImage}
          onDelete={(ids) => deleteImagesMutation.mutate(ids)}
          onRefresh={() => refetchImages()}
          onSelectAll={handleSelectAll}
          isDeleting={deleteImagesMutation.isPending}
        />

        <ProductSearchPanel
          products={products}
          isLoading={productsLoading}
          selectedProduct={selectedProduct}
          onProductSelect={setSelectedProduct}
        />
      </div>

      <LinkingActionCard
        selectedImage={selectedImage}
        selectedProduct={selectedProduct}
        selectedUnlinkedCount={selectedUnlinkedImages.length}
        isLinking={linkImageMutation.isPending}
        isBulkLinking={bulkLinkMutation.isPending}
        onLinkImage={handleLinkImage}
        onBulkLink={handleBulkLink}
      />

      <ImageLinkingPreview
        image={previewImage}
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
