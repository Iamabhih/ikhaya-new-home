import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Database, Image, Link as LinkIcon, AlertCircle, CheckCircle, 
  ExternalLink, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductWithoutImage {
  id: string;
  name: string;
  sku: string;
  category_name?: string;
  created_at: string;
}

interface StorageImage {
  name: string;
  fullPath: string;
  publicUrl: string;
  extractedSKUs: Array<{
    sku: string;
    confidence: number;
    source: string;
  }>;
}

interface PotentialMatch {
  product: ProductWithoutImage;
  possibleImages: StorageImage[];
  bestMatch?: StorageImage;
  bestScore: number;
}

export const MissingImageReportTool = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const { toast } = useToast();

  // Fetch products without images
  const { data: productsWithoutImages, isLoading, refetch } = useQuery({
    queryKey: ['products-without-images'],
    queryFn: async () => {
      console.log("Fetching products without images...");
      
      // Get all products with their categories
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, sku, created_at,
          categories!inner(name)
        `)
        .eq('is_active', true)
        .not('sku', 'is', null);

      if (productsError) throw productsError;

      // Get products that have images
      const { data: productsWithImages, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('image_status', 'active');

      if (imagesError) throw imagesError;

      const productsWithImageIds = new Set(productsWithImages?.map(img => img.product_id) || []);
      
      const productsWithoutImages = allProducts?.filter(product => 
        !productsWithImageIds.has(product.id)
      ).map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category_name: product.categories?.name,
        created_at: product.created_at
      })) || [];

      console.log(`Found ${productsWithoutImages.length} products without images`);
      return productsWithoutImages;
    }
  });

  const filteredProducts = productsWithoutImages?.filter(product =>
    !searchTerm || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Enhanced SKU extraction function (simplified version)
  const extractSKUsFromFilename = (filename: string): Array<{sku: string, confidence: number, source: string}> => {
    const skus: Array<{sku: string, confidence: number, source: string}> = [];
    let cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, '');
    
    // Handle double dots
    cleanName = cleanName.replace(/\.+$/, '');
    
    // Exact numeric match
    if (/^\d{3,8}$/.test(cleanName)) {
      skus.push({ sku: cleanName, confidence: 100, source: 'exact' });
    }
    
    // Multi-SKU patterns
    const multiMatch = cleanName.match(/^(\d{3,8}(?:[._-]\d{3,8})+)[._-]?[a-zA-Z]*\.?$/);
    if (multiMatch) {
      const numbers = multiMatch[1].match(/\d{3,8}/g) || [];
      numbers.forEach((num, index) => {
        skus.push({
          sku: num,
          confidence: Math.max(90 - (index * 3), 70),
          source: 'multi'
        });
      });
    }

    // Pattern extraction
    const patterns = [/(\d{3,8})(?:[._-][a-zA-Z]+)+/g, /(\d{3,8})/g];
    patterns.forEach((pattern, patternIndex) => {
      const matches = [...cleanName.matchAll(pattern)];
      matches.forEach(match => {
        const num = match[1];
        if (num && !skus.find(s => s.sku === num)) {
          let confidence = 60 - (patternIndex * 20);
          if (cleanName.startsWith(num)) confidence += 20;
          
          skus.push({ 
            sku: num, 
            confidence: Math.max(30, confidence), 
            source: 'pattern' 
          });
        }
      });
    });
    
    return skus.sort((a, b) => b.confidence - a.confidence);
  };

  const analyzePotentialMatches = async () => {
    if (!productsWithoutImages?.length) return;
    
    setIsAnalyzing(true);
    try {
      console.log("Analyzing potential matches...");
      
      // Get all storage images
      const { data: storageList, error: storageError } = await supabase.storage
        .from('product-images')
        .list('', { limit: 1000 });

      if (storageError) throw storageError;

      const allImages: StorageImage[] = [];
      
      // Process storage images
      for (const item of storageList || []) {
        if (item.name && item.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(item.name);
          
          const extractedSKUs = extractSKUsFromFilename(item.name);
          
          allImages.push({
            name: item.name,
            fullPath: item.name,
            publicUrl,
            extractedSKUs
          });
        }
      }

      console.log(`Analyzing ${allImages.length} storage images against ${productsWithoutImages.length} products`);

      // Match products to images
      const matches: PotentialMatch[] = [];
      
      for (const product of productsWithoutImages) {
        const possibleImages: StorageImage[] = [];
        let bestMatch: StorageImage | undefined;
        let bestScore = 0;

        for (const image of allImages) {
          for (const extractedSKU of image.extractedSKUs) {
            let score = 0;
            
            // Exact match
            if (product.sku.toLowerCase() === extractedSKU.sku.toLowerCase()) {
              score = extractedSKU.confidence;
            }
            // Zero-padding variations
            else if (product.sku.replace(/^0+/, '') === extractedSKU.sku.replace(/^0+/, '')) {
              score = extractedSKU.confidence * 0.9;
            }
            // Contains match
            else if (product.sku.includes(extractedSKU.sku) || extractedSKU.sku.includes(product.sku)) {
              score = extractedSKU.confidence * 0.7;
            }
            
            if (score >= 30) {
              possibleImages.push(image);
              if (score > bestScore) {
                bestScore = score;
                bestMatch = image;
              }
              break; // Found a match for this image
            }
          }
        }

        if (possibleImages.length > 0) {
          matches.push({
            product,
            possibleImages: [...new Set(possibleImages)], // Remove duplicates
            bestMatch,
            bestScore
          });
        }
      }

      matches.sort((a, b) => b.bestScore - a.bestScore);
      setPotentialMatches(matches);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${matches.length} products with potential image matches`,
      });
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createManualLink = async (productId: string, imageUrl: string, productName: string, imageName: string) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: `${productName} - ${imageName}`,
          image_status: 'active',
          is_primary: true,
          sort_order: 1,
          match_confidence: 100,
          match_metadata: {
            source: 'manual_link',
            filename: imageName,
            linked_by: 'admin'
          },
          auto_matched: false
        });

      if (error) throw error;

      toast({
        title: "Image Linked Successfully",
        description: `${imageName} has been linked to ${productName}`,
      });
      
      // Refresh the data
      refetch();
      
    } catch (error) {
      toast({
        title: "Link Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Missing Image Report & Manual Linking
          <Badge variant="outline">{filteredProducts.length} products</Badge>
        </CardTitle>
        <CardDescription>
          View products without images and manually link them to storage images when automatic matching fails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool shows products missing images and helps create manual links when automated repair tools can't find matches.
          </AlertDescription>
        </Alert>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by product name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Button onClick={analyzePotentialMatches} disabled={isAnalyzing}>
            <Search className="h-4 w-4 mr-2" />
            {isAnalyzing ? "Analyzing..." : "Find Potential Matches"}
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics */}
        {productsWithoutImages && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{productsWithoutImages.length}</div>
              <div className="text-sm text-muted-foreground">Products Without Images</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{potentialMatches.length}</div>
              <div className="text-sm text-muted-foreground">Potential Matches Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {potentialMatches.filter(m => m.bestScore >= 70).length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence Matches</div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading products without images...</p>
          </div>
        )}

        {/* Potential Matches Section */}
        {potentialMatches.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Potential Matches</h3>
            <ScrollArea className="h-96 w-full border rounded-lg p-4">
              <div className="space-y-4">
                {potentialMatches.map((match) => (
                  <div key={match.product.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{match.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          SKU: {match.product.sku} • Category: {match.product.category_name}
                        </p>
                      </div>
                      <Badge variant={match.bestScore >= 70 ? 'default' : 'secondary'}>
                        {match.bestScore.toFixed(0)}% match
                      </Badge>
                    </div>
                    
                    {match.bestMatch && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                        <img 
                          src={match.bestMatch.publicUrl} 
                          alt={match.bestMatch.name}
                          className="w-16 h-16 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{match.bestMatch.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Extracted SKUs: {match.bestMatch.extractedSKUs.map(s => `${s.sku}(${s.confidence}%)`).join(', ')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => createManualLink(
                            match.product.id, 
                            match.bestMatch!.publicUrl, 
                            match.product.name, 
                            match.bestMatch!.name
                          )}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Products Without Images List */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Products Without Images ({filteredProducts.length})</h3>
          <ScrollArea className="h-64 w-full border rounded-lg">
            <div className="p-4 space-y-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded border">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku} • Category: {product.category_name} • 
                      Created: {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">No Image</Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/admin/products`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredProducts.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No products match your search criteria' : 'No products without images found!'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};