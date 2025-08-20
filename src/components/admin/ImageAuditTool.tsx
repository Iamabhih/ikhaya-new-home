import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Database, Image, AlertTriangle, CheckCircle, 
  RefreshCw, Link2, Unlink, Share, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductWithImages {
  id: string;
  name: string;
  sku: string;
  image_count: number;
  has_primary: boolean;
  product_images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
    match_confidence?: number;
    auto_matched?: boolean;
  }>;
}

interface OrphanImage {
  id: string;
  name: string;
  fullPath: string;
  potential_skus: string[];
  confidence: number;
}

export const ImageAuditTool = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("shared");
  const { toast } = useToast();

  // Query for products with shared images (same image used by multiple products)
  const { data: sharedImageProducts, refetch: refetchShared, isLoading: sharedLoading } = useQuery({
    queryKey: ['shared-image-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select(`
          image_url,
          product_id,
          products!inner(id, name, sku)
        `);

      if (error) throw error;

      // Group by image_url to find shared images
      const imageGroups = new Map();
      data?.forEach(item => {
        if (!imageGroups.has(item.image_url)) {
          imageGroups.set(item.image_url, []);
        }
        imageGroups.get(item.image_url).push(item);
      });

      // Find images shared across multiple products
      const sharedImages = Array.from(imageGroups.entries())
        .filter(([_, products]) => products.length > 1)
        .map(([imageUrl, products]) => ({
          image_url: imageUrl,
          product_count: products.length,
          products: products.map((p: any) => ({
            id: p.product_id,
            name: p.products.name,
            sku: p.products.sku
          }))
        }));

      return sharedImages;
    },
    staleTime: 30000,
  });

  // Query for products without images
  const { data: missingImageProducts, refetch: refetchMissing, isLoading: missingLoading } = useQuery({
    queryKey: ['missing-image-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku,
          product_images(id)
        `)
        .eq('is_active', true)
        .is('product_images.id', null);

      if (error) throw error;
      return data?.filter(p => p.sku && p.sku.trim() !== '') || [];
    },
    staleTime: 30000,
  });

  // Query for products with primary image issues
  const { data: multiplePrimaryProducts, refetch: refetchMultiplePrimary, isLoading: multiplePrimaryLoading } = useQuery({
    queryKey: ['multiple-primary-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku,
          product_images!inner(id, is_primary)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Filter products that have multiple primary images or no primary images
      const productsWithIssues = data?.filter(product => {
        const primaryCount = product.product_images.filter((img: any) => img.is_primary).length;
        return primaryCount !== 1;
      }).map(product => ({
        ...product,
        primary_count: product.product_images.filter((img: any) => img.is_primary).length
      })) || [];

      return productsWithIssues;
    },
    staleTime: 30000,
  });

  const handleUnlinkImage = async (imageUrl: string, productId: string) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('image_url', imageUrl)
        .eq('product_id', productId);
      
      if (error) throw error;
      
      toast({
        title: "Image Unlinked",
        description: "Image has been unlinked from this product",
      });
      
      refetchShared();
    } catch (error) {
      toast({
        title: "Unlink Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleFixPrimaryImages = async (productId: string) => {
    try {
      // Get all images for this product
      const { data: images, error: fetchError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!images || images.length === 0) {
        toast({
          title: "No Images Found",
          description: "This product has no images to fix",
          variant: "destructive",
        });
        return;
      }

      // Find primary images
      const primaryImages = images.filter(img => img.is_primary);
      
      if (primaryImages.length === 0) {
        // No primary image, set the first one as primary
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', images[0].id);

        if (updateError) throw updateError;
      } else if (primaryImages.length > 1) {
        // Multiple primary images, keep only the first one
        const primaryToKeep = primaryImages[0];
        const primariesToRemove = primaryImages.slice(1);

        const { error: updateError } = await supabase
          .from('product_images')
          .update({ is_primary: false })
          .in('id', primariesToRemove.map(img => img.id));

        if (updateError) throw updateError;
      }
      
      toast({
        title: "Primary Images Fixed",
        description: "Primary image assignments corrected",
      });
      
      refetchMultiplePrimary();
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "SKU copied to clipboard",
    });
  };

  const filteredShared = sharedImageProducts?.filter(img => 
    !searchTerm || 
    img.products.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  const filteredMissing = missingImageProducts?.filter(p => 
    !searchTerm || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredMultiplePrimary = multiplePrimaryProducts?.filter((p: any) => 
    !searchTerm || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Image Audit Tool
        </CardTitle>
        <CardDescription>
          Comprehensive audit of product images. Images can be shared across multiple products, and products can have multiple images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              refetchShared();
              refetchMissing();
              refetchMultiplePrimary();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <Share className="h-4 w-4" />
              Shared Images ({sharedImageProducts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="missing" className="flex items-center gap-2">
              <Unlink className="h-4 w-4" />
              Missing ({missingImageProducts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="primary" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Primary Issues ({multiplePrimaryProducts?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Shared Images Tab */}
          <TabsContent value="shared" className="space-y-4">
            <Alert>
              <Share className="h-4 w-4" />
              <AlertDescription>
                Images that are shared across multiple products. This is allowed and can be useful for product variants or related items.
              </AlertDescription>
            </Alert>

            {sharedLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading shared images...</span>
              </div>
            ) : (
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {filteredShared.map((sharedImage, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            <span className="text-sm font-medium">Image shared across {sharedImage.product_count} products</span>
                          </div>
                          <Badge variant="secondary">
                            {sharedImage.product_count} products
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {sharedImage.image_url}
                          </p>
                          
                          <div className="grid gap-2">
                            {sharedImage.products.map((product: any) => (
                              <div key={product.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{product.name}</span>
                                  <Badge variant="outline" className="cursor-pointer" onClick={() => copyToClipboard(product.sku)}>
                                    {product.sku}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlinkImage(sharedImage.image_url, product.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Unlink className="h-3 w-3" />
                                  Unlink
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {filteredShared.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      No shared images found
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Missing Images Tab */}
          <TabsContent value="missing" className="space-y-4">
            <Alert>
              <Unlink className="h-4 w-4" />
              <AlertDescription>
                Products without any linked images. Use the Image Repair Tool to automatically link matching storage images.
              </AlertDescription>
            </Alert>

            {missingLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading products without images...</span>
              </div>
            ) : (
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {filteredMissing.map((product: any) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="outline" className="cursor-pointer" onClick={() => copyToClipboard(product.sku)}>
                              {product.sku}
                            </Badge>
                            <Badge variant="secondary">
                              <Image className="h-3 w-3 mr-1" />
                              No images
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex items-center gap-2"
                        >
                          <a href={`/products/${product.sku}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View Product
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {filteredMissing.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      All products have images linked
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Primary Image Issues Tab */}
          <TabsContent value="primary" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Products with multiple primary images or no primary image. Each product should have exactly one primary image for display purposes.
              </AlertDescription>
            </Alert>

            {multiplePrimaryLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading primary image issues...</span>
              </div>
            ) : (
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {filteredMultiplePrimary.map((product: any) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="outline" className="cursor-pointer" onClick={() => copyToClipboard(product.sku)}>
                              {product.sku}
                            </Badge>
                            <Badge variant="destructive">
                              {product.primary_count} primary images
                            </Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleFixPrimaryImages(product.id)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Fix Primary
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {filteredMultiplePrimary.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      All products have proper primary image assignments
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
