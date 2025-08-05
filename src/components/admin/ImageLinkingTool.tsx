import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Image, CheckCircle, XCircle, AlertCircle, FileImage, Database, Activity, Search, BarChart3 } from "lucide-react";

interface MigrationProgress {
  status: 'initializing' | 'scanning' | 'processing' | 'completed' | 'error';
  currentStep: string;
  processed: number;
  successful: number;
  failed: number;
  total: number;
  currentFile?: string;
  errors: string[];
}

interface ProcessLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

interface UnlinkedProduct {
  sku: string;
  name: string;
  category?: string;
}

interface AvailableImage {
  filename: string;
  path: string;
  extractedSkus: string[];
  size: number;
}

export const ImageLinkingTool = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [lastResults, setLastResults] = useState<any>(null);
  const [processLogs, setProcessLogs] = useState<ProcessLog[]>([]);
  const [stats, setStats] = useState<{
    totalProducts: number;
    productsWithImages: number;
    availableImages: number;
    unlinkedProducts: number;
  } | null>(null);
  const [unlinkedProducts, setUnlinkedProducts] = useState<UnlinkedProduct[]>([]);
  const [availableImages, setAvailableImages] = useState<AvailableImage[]>([]);
  const [detailAnalysis, setDetailAnalysis] = useState<{
    potentialMatches: Array<{
      productSku: string;
      productName: string;
      matchingImages: string[];
      confidence: 'high' | 'medium' | 'low';
    }>;
  } | null>(null);

  const addLog = (level: ProcessLog['level'], message: string, details?: any) => {
    const newLog: ProcessLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setProcessLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  const loadStats = async () => {
    try {
      addLog('info', 'Loading system statistics...');
      
      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get products with images
      const { count: productsWithImages } = await supabase
        .from('products')
        .select('*, product_images!inner(*)', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get available images in storage with pagination
      let allStorageFiles: any[] = [];
      let offset = 0;
      const limit = 5000;
      let hasMore = true;

      while (hasMore) {
        const { data: storageFiles } = await supabase.storage
          .from('product-images')
          .list('MULTI_MATCH_ORGANIZED', { limit, offset });

        if (!storageFiles || storageFiles.length === 0) {
          hasMore = false;
          break;
        }

        allStorageFiles.push(...storageFiles);
        
        if (storageFiles.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      const availableImages = allStorageFiles.length;
      const unlinkedProducts = (totalProducts || 0) - (productsWithImages || 0);

      setStats({
        totalProducts: totalProducts || 0,
        productsWithImages: productsWithImages || 0,
        availableImages,
        unlinkedProducts
      });

      addLog('success', `Stats loaded: ${totalProducts} total, ${productsWithImages} with images, ${unlinkedProducts} unlinked`);
    } catch (error) {
      console.error('Error loading stats:', error);
      addLog('error', 'Failed to load statistics', error);
    }
  };

  const loadUnlinkedProducts = async () => {
    try {
      addLog('info', 'Loading unlinked products...');
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          sku, name,
          categories(name)
        `)
        .eq('is_active', true)
        .not('sku', 'is', null)
        .limit(20000);

      if (error) throw error;

      // Filter out products that have images
      const { data: productsWithImages } = await supabase
        .from('product_images')
        .select('product_id, products!inner(sku)')
        .limit(20000);

      const linkedSkus = new Set(productsWithImages?.map(p => p.products?.sku).filter(Boolean) || []);
      
      const unlinked = products
        ?.filter(p => !linkedSkus.has(p.sku))
        .map(p => ({
          sku: p.sku,
          name: p.name,
          category: (p.categories as any)?.name
        })) || [];

      setUnlinkedProducts(unlinked);
      addLog('info', `Found ${unlinked.length} unlinked products`);
    } catch (error) {
      addLog('error', 'Failed to load unlinked products', error);
    }
  };

  const loadAvailableImages = async () => {
    try {
      addLog('info', 'Analyzing available images...');
      
      // Get all storage files with pagination
      let allStorageFiles: any[] = [];
      let offset = 0;
      const limit = 5000;
      let hasMore = true;

      while (hasMore) {
        const { data: storageFiles } = await supabase.storage
          .from('product-images')
          .list('MULTI_MATCH_ORGANIZED', { limit, offset });

        if (!storageFiles || storageFiles.length === 0) {
          hasMore = false;
          break;
        }

        allStorageFiles.push(...storageFiles);
        
        if (storageFiles.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      const imageAnalysis: AvailableImage[] = [];
      
      for (const file of allStorageFiles) {
        if (file.name && file.metadata?.mimetype?.startsWith('image/')) {
          // Extract SKUs from filename (simplified extraction for analysis)
          const extractedSkus = extractSKUsFromFilename(file.name);
          
          imageAnalysis.push({
            filename: file.name,
            path: `MULTI_MATCH_ORGANIZED/${file.name}`,
            extractedSkus,
            size: file.metadata.size || 0
          });
        }
      }

      setAvailableImages(imageAnalysis);
      addLog('success', `Analyzed ${imageAnalysis.length} available images`);
    } catch (error) {
      addLog('error', 'Failed to analyze available images', error);
    }
  };

  const performDetailedAnalysis = async () => {
    if (unlinkedProducts.length === 0 || availableImages.length === 0) return;

    addLog('info', 'Performing detailed matching analysis...');

    const potentialMatches: Array<{
      productSku: string;
      productName: string;
      matchingImages: string[];
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    for (const product of unlinkedProducts.slice(0, 20)) {
      const matchingImages: string[] = [];
      
      for (const image of availableImages) {
        // Check if any extracted SKU matches the product SKU
        const hasDirectMatch = image.extractedSkus.includes(product.sku);
        const hasFuzzyMatch = image.extractedSkus.some(imageSku => 
          fuzzyMatch(product.sku, imageSku)
        );
        
        if (hasDirectMatch || hasFuzzyMatch) {
          matchingImages.push(image.filename);
        }
      }
      
      if (matchingImages.length > 0) {
        const confidence = matchingImages.some(img => 
          availableImages.find(ai => ai.filename === img)?.extractedSkus.includes(product.sku)
        ) ? 'high' : 'medium';
        
        potentialMatches.push({
          productSku: product.sku,
          productName: product.name,
          matchingImages,
          confidence
        });
      }
    }

    setDetailAnalysis({ potentialMatches });
    addLog('success', `Found ${potentialMatches.length} potential matches for analysis`);
  };

  const extractSKUsFromFilename = (filename: string): string[] => {
    const skus: string[] = [];
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Basic numeric extraction (3-8 digits)
    const matches = nameWithoutExt.match(/\b\d{3,8}\b/g);
    if (matches) {
      skus.push(...matches);
    }
    
    return skus;
  };

  const fuzzyMatch = (sku1: string, sku2: string): boolean => {
    if (!sku1 || !sku2) return false;
    
    // Direct match
    if (sku1 === sku2) return true;
    
    // Zero padding variations
    if (sku1.length === 3 && sku2 === '0' + sku1) return true;
    if (sku2.length === 3 && sku1 === '0' + sku2) return true;
    
    return false;
  };

  useEffect(() => {
    loadStats();
    loadUnlinkedProducts();
    loadAvailableImages();
  }, []);

  useEffect(() => {
    if (unlinkedProducts.length > 0 && availableImages.length > 0) {
      performDetailedAnalysis();
    }
  }, [unlinkedProducts, availableImages]);

  const startImageLinking = async () => {
    setIsRunning(true);
    setProgress(null);
    setLastResults(null);
    addLog('info', 'Starting enhanced image linking process...');

    try {
      const { data, error } = await supabase.functions.invoke('migrate-drive-images', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setLastResults(data);
      
      if (data.success) {
        addLog('success', `Image linking completed! ${data.results.successful} products linked successfully.`);
        toast.success(`Image linking completed! ${data.results.successful} products linked successfully.`);
        // Reload stats after successful linking
        loadStats();
        loadUnlinkedProducts();
      } else {
        addLog('error', `Image linking failed: ${data.error}`);
        toast.error(`Image linking failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Image linking error:', error);
      addLog('error', `Failed to start image linking: ${error.message}`, error);
      toast.error(`Failed to start image linking: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    if (!progress) return <Image className="h-4 w-4" />;
    
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  const getLogIcon = (level: ProcessLog['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.productsWithImages}</div>
                  <div className="text-sm text-muted-foreground">With Images</div>
                  <div className="text-xs text-green-600">
                    {stats.totalProducts > 0 ? Math.round((stats.productsWithImages / stats.totalProducts) * 100) : 0}% coverage
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.availableImages}</div>
                  <div className="text-sm text-muted-foreground">Available Images</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.unlinkedProducts}</div>
                  <div className="text-sm text-muted-foreground">Need Images</div>
                  <div className="text-xs text-orange-600">
                    {stats.totalProducts > 0 ? Math.round((stats.unlinkedProducts / stats.totalProducts) * 100) : 0}% unlinked
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="control">Control Panel</TabsTrigger>
          <TabsTrigger value="logs">Process Logs</TabsTrigger>
          <TabsTrigger value="analysis">Detail Analysis</TabsTrigger>
          <TabsTrigger value="unlinked">Unlinked Products</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Enhanced Image Linking Tool
              </CardTitle>
              <CardDescription>
                Automatically link products to images from the MULTI_MATCH_ORGANIZED storage folder using intelligent SKU matching.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={startImageLinking} 
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Image className="h-4 w-4" />
                      Start Image Linking
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    loadStats();
                    loadUnlinkedProducts();
                    loadAvailableImages();
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Data
                </Button>
                
                {progress && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getStatusIcon()}
                    {progress.status}
                  </Badge>
                )}
              </div>

              {progress && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{progress.currentStep}</span>
                      <span>{progress.processed}/{progress.total}</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="w-full" />
                  </div>

                  {progress.currentFile && (
                    <p className="text-sm text-muted-foreground">
                      Current: {progress.currentFile}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{progress.successful}</div>
                      <div className="text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{progress.failed}</div>
                      <div className="text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{progress.processed}</div>
                      <div className="text-muted-foreground">Processed</div>
                    </div>
                  </div>
                </div>
              )}

              {lastResults && !isRunning && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {lastResults.success ? 'Completed Successfully!' : 'Completed with Issues'}
                      </p>
                      {lastResults.results && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-green-600">{lastResults.results.successful}</span> successful
                          </div>
                          <div>
                            <span className="font-medium text-red-600">{lastResults.results.failed}</span> failed
                          </div>
                          <div>
                            <span className="font-medium">{lastResults.results.processed}</span> total
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Process Logs
                <Badge variant="outline">{processLogs.length}</Badge>
              </CardTitle>
              <CardDescription>
                Real-time system activity and debugging information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {processLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{log.message}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.level}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        {log.details && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {processLogs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No logs yet. Start the image linking process to see activity.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Detailed Analysis
              </CardTitle>
              <CardDescription>
                Potential matches found between unlinked products and available images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailAnalysis ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {detailAnalysis.potentialMatches.map((match, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">SKU: {match.productSku}</div>
                            <div className="text-sm text-muted-foreground">{match.productName}</div>
                          </div>
                          <Badge variant={match.confidence === 'high' ? 'default' : 'secondary'}>
                            {match.confidence} confidence
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <strong>Matching Images:</strong>
                          <ul className="mt-1 ml-4 list-disc">
                            {match.matchingImages.map((img, imgIndex) => (
                              <li key={imgIndex} className="text-xs text-muted-foreground">{img}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                    {detailAnalysis.potentialMatches.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No potential matches found. This could mean either all products are linked or the matching algorithm needs tuning.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Loading analysis...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unlinked">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Unlinked Products
                <Badge variant="outline">{unlinkedProducts.length}</Badge>
              </CardTitle>
              <CardDescription>
                Products without images that need to be linked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {unlinkedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">SKU: {product.sku}</div>
                        <div className="text-sm text-muted-foreground">{product.name}</div>
                        {product.category && (
                          <Badge variant="outline" className="text-xs mt-1">{product.category}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {unlinkedProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      Great! All products have images linked.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};