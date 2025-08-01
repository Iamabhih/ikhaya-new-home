import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  Link, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye
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
}

export const ManualImageLinker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<CachedImage | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "linked" | "unlinked">("unlinked");
  const [previewImage, setPreviewImage] = useState<CachedImage | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  // Fetch cached images from Google Drive scanning
  const { data: cachedImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['cached-drive-images', debouncedSearchTerm, filterStatus],
    queryFn: async () => {
      let query = (supabase as any)
        .from('cached_drive_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`filename.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }

      if (filterStatus === 'linked') {
        query = query.eq('is_linked', true);
      } else if (filterStatus === 'unlinked') {
        query = query.eq('is_linked', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CachedImage[];
    },
  });

  // Fetch products for linking
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-linking', debouncedSearchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,sku.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Product[];
    },
  });

  // Mutation to link image to product
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

      // Download image from Google Drive
      const imageResponse = await fetch(imageData.direct_url);
      if (!imageResponse.ok) {
        throw new Error('Failed to download image from Google Drive');
      }

      const imageBlob = await imageResponse.blob();
      const fileExtension = imageData.filename.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const fileName = `${product.sku}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageBlob, {
          contentType: imageData.mime_type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Check if product already has a primary image
      const { data: existingImage } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', productId)
        .eq('is_primary', true)
        .single();

      // Create or update product image record
      if (existingImage) {
        const { error: updateError } = await supabase
          .from('product_images')
          .update({
            image_url: urlData.publicUrl,
            alt_text: `${product.name} product image`
          })
          .eq('id', existingImage.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: urlData.publicUrl,
            alt_text: `${product.name} product image`,
            is_primary: true,
            sort_order: 0
          });

        if (insertError) throw insertError;
      }

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

      return { product, image: imageData };
    },
    onSuccess: (data) => {
      toast.success(`Successfully linked image to ${data.product.name}`);
      queryClient.invalidateQueries({ queryKey: ['cached-drive-images'] });
      setSelectedProduct(null);
      setSelectedImage(null);
    },
    onError: (error) => {
      toast.error(`Failed to link image: ${error.message}`);
    },
  });

  // Mutation to delete cached image
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await (supabase as any)
        .from('cached_drive_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Image removed from cache');
      queryClient.invalidateQueries({ queryKey: ['cached-drive-images'] });
    },
    onError: (error) => {
      toast.error(`Failed to remove image: ${error.message}`);
    },
  });

  const handleLinkImage = useCallback(() => {
    if (selectedImage && selectedProduct) {
      linkImageMutation.mutate({
        imageId: selectedImage.id,
        productId: selectedProduct.id
      });
    }
  }, [selectedImage, selectedProduct, linkImageMutation]);

  const filteredImages = cachedImages.filter(image => {
    if (filterStatus === 'linked') return image.is_linked;
    if (filterStatus === 'unlinked') return !image.is_linked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Manual Image Linking
          </CardTitle>
          <CardDescription>
            Review and manually link images discovered from Google Drive scanning to products.
            This shows cached images from previous Drive scans that need manual review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
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
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Images</SelectItem>
                <SelectItem value="unlinked">Unlinked Only</SelectItem>
                <SelectItem value="linked">Linked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold">{cachedImages.length}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {cachedImages.filter(img => img.is_linked).length}
              </div>
              <div className="text-sm text-muted-foreground">Linked</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {cachedImages.filter(img => !img.is_linked).length}
              </div>
              <div className="text-sm text-muted-foreground">Unlinked</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {cachedImages.filter(img => img.sku).length}
              </div>
              <div className="text-sm text-muted-foreground">With SKU</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cached Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Cached Images ({filteredImages.length})
            </CardTitle>
            <CardDescription>
              Images discovered from Google Drive scans
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
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <div className="flex items-start justify-between">
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
                            <p>Scanned: {new Date(image.created_at).toLocaleDateString()}</p>
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
                                  deleteImageMutation.mutate(image.id);
                                }
                              }}
                              disabled={deleteImageMutation.isPending}
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

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Select a product to link with the selected image
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
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Link Action */}
      {selectedImage && selectedProduct && !selectedImage.is_linked && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to link:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedImage.filename} → {selectedProduct.name} ({selectedProduct.sku})
                </p>
              </div>
              <Button
                onClick={handleLinkImage}
                disabled={linkImageMutation.isPending}
                className="flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                {linkImageMutation.isPending ? 'Linking...' : 'Link Image'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.filename}</DialogTitle>
            <DialogDescription>
              Preview of cached image from Google Drive
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
                  <strong>Status:</strong> {previewImage.is_linked ? 'Linked' : 'Unlinked'}
                </div>
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