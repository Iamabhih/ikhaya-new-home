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
  RefreshCw, Link2, Unlink, Copy, ExternalLink
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
  const [activeTab, setActiveTab] = useState("duplicates");
  const { toast } = useToast();

  // Query for products with duplicate images
  const { data: duplicateProducts, refetch: refetchDuplicates, isLoading: duplicatesLoading } = useQuery({
    queryKey: ['duplicate-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku,
          product_images!inner(id, image_url, is_primary, match_confidence, auto_matched)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Group by product and find duplicates
      const productsWithCounts = data?.map(product => {
        const imageUrls = new Set();
        const duplicateUrls = new Set();
        
        product.product_images.forEach((img: any) => {
          if (imageUrls.has(img.image_url)) {
            duplicateUrls.add(img.image_url);
          } else {
            imageUrls.add(img.image_url);
          }
        });

        return {
          ...product,
          image_count: product.product_images.length,
          has_duplicates: duplicateUrls.size > 0,
          duplicate_urls: Array.from(duplicateUrls),
          has_primary: product.product_images.some((img: any) => img.is_primary)
        };
      }).filter(p => p.has_duplicates) || [];

      return productsWithCounts;
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

  // Query for products with multiple primary images
  const { data: multiplePrimaryProducts, refetch: refetchMultiplePrimary, isLoading: multiplePrimaryLoading } = useQuery({
    queryKey: ['multiple-primary-products'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_products_with_multiple_primary_images');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const handleFixDuplicates = async (productId: string) => {
    try {
      const { error } = await supabase.rpc('fix_duplicate_product_images', { 
        target_product_id: productId 
      });
      
      if (error) throw error;
      
      toast({
        title: "Duplicates Fixed",
        description: "Duplicate images removed successfully",
      });
      
      refetchDuplicates();
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleFixPrimaryImages = async (productId: string) => {
    try {
      const { error } = await supabase.rpc('fix_primary_image_assignments', { 
        target_product_id: productId 
      });
      
      if (error) throw error;
      
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

  const filteredDuplicates = duplicateProducts?.filter(p => 
    !searchTerm || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
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
          Comprehensive audit of product images to identify duplicates, missing links, and orphaned files.
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
              refetchDuplicates();
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
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Duplicates ({duplicateProducts?.length || 0})
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

          {/* Duplicate Images Tab */}
          <TabsContent value="duplicates" className="space-y-4">
            <Alert>
              <Copy className="h-4 w-4" />
              <AlertDescription>
                Products with duplicate image entries. These can slow down the site and confuse customers.
              </AlertDescription>
            </Alert>

            {duplicatesLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading duplicate products...</span>
              </div>
            ) : (
              <ScrollArea className="h-96 w-full">
                <div className="space-y-3">
                  {filteredDuplicates.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{product.name}</h4>
                            <Badge variant="outline" className="cursor-pointer" onClick={() => copyToClipboard(product.sku)}>
                              {product.sku}
                            </Badge>
                            <Badge variant="destructive">
                              {product.image_count} images
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {product.duplicate_urls.length} duplicate URL(s) found
                          </p>
                        </div>
                        <Button
                          onClick={() => handleFixDuplicates(product.id)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Fix Duplicates
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {filteredDuplicates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      No duplicate images found
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
                Products with multiple primary images or no primary image. Each product should have exactly one primary image.
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