import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Link, ImageIcon, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export const ManualImageLinker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<StorageFile[]>([]);
  const queryClient = useQueryClient();

  // Fetch products matching search
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.trim().length > 2,
  });

  // Fetch storage images
  const { data: storageImages = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['storage-images', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('product-images')
        .list('', {
          limit: 100,
          offset: 0,
        });
      
      if (error) throw error;
      
      // Filter images by search term if provided
      let filteredImages = data || [];
      if (searchTerm.trim()) {
        filteredImages = filteredImages.filter(file => 
          file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (selectedProduct?.sku && file.name.toLowerCase().includes(selectedProduct.sku.toLowerCase()))
        );
      }
      
      return filteredImages;
    },
    enabled: true,
  });

  // Link images to product mutation
  const linkImagesMutation = useMutation({
    mutationFn: async ({ productId, images }: { productId: string; images: StorageFile[] }) => {
      const imageInserts = images.map((image, index) => ({
        product_id: productId,
        image_url: `https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/product-images/${image.name}`,
        alt_text: `${selectedProduct?.name || 'Product'} image ${index + 1}`,
        is_primary: index === 0, // First image is primary
        sort_order: index,
      }));

      const { error } = await supabase
        .from('product_images')
        .insert(imageInserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Successfully linked ${selectedImages.length} image(s) to ${selectedProduct?.name}`);
      setSelectedImages([]);
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to link images: ${error.message}`);
    },
  });

  const handleLinkImages = () => {
    if (!selectedProduct || selectedImages.length === 0) {
      toast.error("Please select a product and at least one image");
      return;
    }
    
    linkImagesMutation.mutate({
      productId: selectedProduct.id,
      images: selectedImages,
    });
  };

  const toggleImageSelection = (image: StorageFile) => {
    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  const getImageUrl = (fileName: string) => {
    return `https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/product-images/${fileName}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Manual Image Linker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Products */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Products by Name or SKU</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              placeholder="Enter product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetchImages()}
              disabled={imagesLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product Results */}
        {productsLoading && <div>Searching products...</div>}
        {products.length > 0 && (
          <div className="space-y-2">
            <Label>Select Product:</Label>
            <div className="grid gap-2">
              {products.map((product) => (
                <Button
                  key={product.id}
                  variant={selectedProduct?.id === product.id ? "default" : "outline"}
                  onClick={() => setSelectedProduct(product)}
                  className="justify-start"
                >
                  <span className="font-medium">{product.name}</span>
                  {product.sku && <Badge variant="secondary" className="ml-2">{product.sku}</Badge>}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Product */}
        {selectedProduct && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Selected Product:</span>
              <span>{selectedProduct.name}</span>
              {selectedProduct.sku && <Badge>{selectedProduct.sku}</Badge>}
            </div>
          </div>
        )}

        {/* Storage Images */}
        <div className="space-y-2">
          <Label>Available Images in Storage:</Label>
          {imagesLoading ? (
            <div>Loading images...</div>
          ) : storageImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {storageImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative border-2 rounded-lg p-2 cursor-pointer transition-colors ${
                    selectedImages.some(img => img.id === image.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleImageSelection(image)}
                >
                  <div className="aspect-square bg-muted rounded flex items-center justify-center mb-2">
                    <img
                      src={getImageUrl(image.name)}
                      alt={image.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <ImageIcon className="h-8 w-8 text-muted-foreground hidden" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{image.name}</p>
                  {selectedImages.some(img => img.id === image.id) && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No images found in storage bucket
            </div>
          )}
        </div>

        {/* Link Button */}
        {selectedProduct && selectedImages.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Ready to link:</p>
              <p className="text-sm text-muted-foreground">
                {selectedImages.length} image(s) to {selectedProduct.name}
              </p>
            </div>
            <Button 
              onClick={handleLinkImages}
              disabled={linkImagesMutation.isPending}
              className="gap-2"
            >
              <Link className="h-4 w-4" />
              {linkImagesMutation.isPending ? 'Linking...' : 'Link Images'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};