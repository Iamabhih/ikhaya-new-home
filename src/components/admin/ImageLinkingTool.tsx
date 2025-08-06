import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Image, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileImage, 
  Database, 
  Activity, 
  Search, 
  BarChart3,
  Settings,
  TrendingUp,
  Clock,
  Zap,
  Target,
  FolderOpen,
  Link
} from "lucide-react";

interface LinkingProgress {
  status: 'idle' | 'scanning' | 'linking' | 'completed' | 'error';
  currentStep: string;
  processed: number;
  successful: number;
  failed: number;
  total: number;
  currentItem?: string;
  errors: string[];
  startTime?: string;
  estimatedCompletion?: string;
}

interface ProcessLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

interface StorageImage {
  filename: string;
  path: string;
  extractedSkus: string[];
  size?: number;
  lastModified?: string;
  url?: string;
}

interface ProductWithoutImage {
  id: string;
  sku: string;
  name: string;
  category?: string;
}

interface LinkingConfig {
  scanAllFolders: boolean;
  targetFolders: string[];
  matchingStrategy: 'exact' | 'fuzzy' | 'aggressive';
  batchSize: number;
  skipExisting: boolean;
  autoSetPrimary: boolean;
  confidenceThreshold: number;
}

interface StorageStats {
  totalImages: number;
  totalFolders: number;
  imagesPerFolder: Record<string, number>;
  lastScanTime?: string;
}

export const ImageLinkingTool = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<LinkingProgress>({
    status: 'idle',
    currentStep: 'Ready to start',
    processed: 0,
    successful: 0,
    failed: 0,
    total: 0,
    errors: []
  });
  
  const [processLogs, setProcessLogs] = useState<ProcessLog[]>([]);
  const [productsWithoutImages, setProductsWithoutImages] = useState<ProductWithoutImage[]>([]);
  const [storageImages, setStorageImages] = useState<StorageImage[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  
  const [stats, setStats] = useState<{
    totalProducts: number;
    productsWithImages: number;
    productsWithoutImages: number;
    totalStorageImages: number;
  }>({
    totalProducts: 0,
    productsWithImages: 0,
    productsWithoutImages: 0,
    totalStorageImages: 0
  });

  const [config, setConfig] = useState<LinkingConfig>({
    scanAllFolders: true,
    targetFolders: ['MULTI_MATCH_ORGANIZED', ''],
    matchingStrategy: 'fuzzy',
    batchSize: 10,
    skipExisting: true,
    autoSetPrimary: true,
    confidenceThreshold: 70
  });

  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // Add log entry
  const addLog = useCallback((level: ProcessLog['level'], message: string, details?: any) => {
    const newLog: ProcessLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setProcessLogs(prev => [newLog, ...prev.slice(0, 499)]); // Keep last 500 logs
  }, []);

  // Extract SKUs from filename with multiple strategies
  const extractSKUsFromFilename = useCallback((filename: string, filepath: string): string[] => {
    const skus = new Set<string>();
    if (!filename) return [];
    
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '');
    
    // Strategy 1: Exact numeric filename (highest priority)
    if (/^\d{3,8}$/.test(nameWithoutExt)) {
      skus.add(nameWithoutExt);
      // Add zero-padded variations
      if (nameWithoutExt.length === 5) {
        skus.add('0' + nameWithoutExt);
      }
      if (nameWithoutExt.startsWith('0')) {
        skus.add(nameWithoutExt.substring(1));
      }
    }
    
    // Strategy 2: Multi-SKU files (e.g., "445033.446723.png")
    const multiSkuPatterns = [
      /(\d{3,8})\.(\d{3,8})/g,
      /(\d{3,8})_(\d{3,8})/g,
      /(\d{3,8})-(\d{3,8})/g,
    ];
    
    for (const pattern of multiSkuPatterns) {
      const matches = [...nameWithoutExt.matchAll(pattern)];
      for (const match of matches) {
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            skus.add(match[i]);
          }
        }
      }
    }
    
    // Strategy 3: Extract from path segments
    const pathSegments = filepath.split('/');
    for (const segment of pathSegments) {
      if (/^\d{3,8}$/.test(segment)) {
        skus.add(segment);
      }
    }
    
    // Strategy 4: SKU with prefixes/suffixes
    const patterns = [
      /(?:SKU|sku|item|ITEM|product|PRODUCT)[-_]?(\d{3,8})/g,
      /(\d{3,8})(?:[-_][a-zA-Z]+)?$/g,
    ];
    
    for (const pattern of patterns) {
      const matches = [...nameWithoutExt.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          skus.add(match[1]);
        }
      }
    }
    
    return Array.from(skus);
  }, []);

  // Calculate match confidence
  const calculateConfidence = useCallback((productSku: string, imageSku: string, filename: string): number => {
    if (!productSku || !imageSku) return 0;
    
    const skuLower = productSku.toLowerCase();
    const imageSkuLower = imageSku.toLowerCase();
    const filenameLower = filename.toLowerCase();
    
    // Exact match = 100%
    if (skuLower === imageSkuLower) return 100;
    
    // Case-insensitive match = 95%
    if (productSku === imageSku) return 95;
    
    // Filename is exactly the SKU = 90%
    if (filenameLower.replace(/\.[^.]+$/, '') === skuLower) return 90;
    
    // SKU appears at start of filename = 80%
    if (filenameLower.startsWith(skuLower)) return 80;
    
    // Zero-padding variations = 75%
    if ((skuLower === '0' + imageSkuLower) || (imageSkuLower === '0' + skuLower)) return 75;
    
    // SKU appears anywhere in filename = 60%
    if (filenameLower.includes(skuLower)) return 60;
    
    return 50;
  }, []);

  // Comprehensive storage scan without limits
  const scanCompleteStorage = useCallback(async () => {
    addLog('info', '🔍 Starting comprehensive storage scan (no limits)...');
    setProgress(prev => ({ ...prev, status: 'scanning', currentStep: 'Scanning storage bucket' }));
    
    const allImages: StorageImage[] = [];
    const folderStats: Record<string, number> = {};
    let totalFolders = 0;
    
    try {
      // Recursive function to scan all directories
      const scanDirectory = async (path: string = '', depth: number = 0): Promise<void> => {
        if (depth > 10) {
          addLog('warn', `Max depth reached at path: ${path}`);
          return;
        }
        
        let offset = 0;
        let hasMore = true;
        const limit = 1000;
        let folderImageCount = 0;
        
        while (hasMore) {
          try {
            const { data: files, error } = await supabase.storage
              .from('product-images')
              .list(path, {
                limit,
                offset,
                sortBy: { column: 'name', order: 'asc' }
              });
            
            if (error) {
              addLog('error', `Failed to list files in "${path}": ${error.message}`);
              break;
            }
            
            if (!files || files.length === 0) {
              hasMore = false;
              break;
            }
            
            // Process each file
            for (const file of files) {
              if (!file.name) continue;
              
              const fullPath = path ? `${path}/${file.name}` : file.name;
              
              // Check if it's a directory
              const isDirectory = !file.id && !file.metadata && !file.name.includes('.');
              
              if (isDirectory) {
                totalFolders++;
                addLog('info', `📁 Found subdirectory: ${fullPath}`);
                // Recursively scan subdirectory
                await scanDirectory(fullPath, depth + 1);
              } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                // It's an image file
                const extractedSkus = extractSKUsFromFilename(file.name, fullPath);
                
                // Get public URL
                const { data: urlData } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(fullPath);
                
                allImages.push({
                  filename: file.name,
                  path: fullPath,
                  extractedSkus,
                  size: file.metadata?.size,
                  lastModified: file.updated_at || file.created_at,
                  url: urlData?.publicUrl
                });
                
                folderImageCount++;
                
                // Log progress every 100 images
                if (allImages.length % 100 === 0) {
                  addLog('info', `📸 Found ${allImages.length} images so far...`);
                  setProgress(prev => ({ 
                    ...prev, 
                    currentStep: `Scanning: ${allImages.length} images found`,
                    total: allImages.length 
                  }));
                }
              }
            }
            
            offset += limit;
            
            if (files.length < limit) {
              hasMore = false;
            }
            
            // Small delay to prevent API overload
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (error) {
            addLog('error', `Error scanning at offset ${offset}: ${error.message}`);
            hasMore = false;
          }
        }
        
        if (folderImageCount > 0) {
          folderStats[path || 'root'] = folderImageCount;
        }
      };
      
      // Start scanning based on configuration
      if (config.scanAllFolders) {
        await scanDirectory('');
      } else {
        for (const folder of config.targetFolders) {
          await scanDirectory(folder);
        }
      }
      
      setStorageImages(allImages);
      setStorageStats({
        totalImages: allImages.length,
        totalFolders,
        imagesPerFolder: folderStats,
        lastScanTime: new Date().toISOString()
      });
      
      addLog('success', `✅ Storage scan complete: ${allImages.length} images found across ${totalFolders} folders`);
      
      // Log folder statistics
      Object.entries(folderStats).forEach(([folder, count]) => {
        if (count > 0) {
          addLog('info', `📊 ${folder}: ${count} images`);
        }
      });
      
      return allImages;
    } catch (error) {
      addLog('error', `Storage scan failed: ${error.message}`);
      throw error;
    }
  }, [config, addLog, extractSKUsFromFilename]);

  // Load products without images
  const loadProductsWithoutImages = useCallback(async () => {
    addLog('info', '📦 Loading products without images...');
    
    try {
      // Get all products
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, categories(name)')
        .not('sku', 'is', null)
        .eq('is_active', true);
      
      if (productsError) throw productsError;
      
      // Get products that have images
      const { data: productsWithImages, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('is_primary', true);
      
      if (imagesError) throw imagesError;
      
      const productsWithImageIds = new Set(productsWithImages?.map(p => p.product_id) || []);
      
      // Filter out products that already have images
      const productsWithoutImgs = allProducts?.filter(p => 
        !productsWithImageIds.has(p.id) && p.sku
      ).map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.categories?.name
      })) || [];
      
      setProductsWithoutImages(productsWithoutImgs);
      
      setStats({
        totalProducts: allProducts?.length || 0,
        productsWithImages: productsWithImageIds.size,
        productsWithoutImages: productsWithoutImgs.length,
        totalStorageImages: storageImages.length
      });
      
      addLog('success', `✅ Found ${productsWithoutImgs.length} products without images`);
      
      return productsWithoutImgs;
    } catch (error) {
      addLog('error', `Failed to load products: ${error.message}`);
      throw error;
    }
  }, [storageImages.length, addLog]);

  // Main linking process
  const startLinkingProcess = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress({
      status: 'scanning',
      currentStep: 'Initializing...',
      processed: 0,
      successful: 0,
      failed: 0,
      total: 0,
      errors: [],
      startTime: new Date().toISOString()
    });
    
    try {
      // Step 1: Scan storage completely
      addLog('info', '🚀 Starting enhanced image linking process...');
      const images = await scanCompleteStorage();
      
      // Step 2: Load products without images
      const products = await loadProductsWithoutImages();
      
      if (products.length === 0) {
        addLog('info', '🎉 All products already have images!');
        setProgress(prev => ({ ...prev, status: 'completed', currentStep: 'All products have images' }));
        return;
      }
      
      // Step 3: Create SKU to image mapping
      addLog('info', '🧠 Building SKU to image mapping...');
      const skuToImages = new Map<string, StorageImage[]>();
      
      for (const image of images) {
        for (const sku of image.extractedSkus) {
          if (!skuToImages.has(sku)) {
            skuToImages.set(sku, []);
          }
          skuToImages.get(sku)!.push(image);
          
          // Also add case variations
          const skuLower = sku.toLowerCase();
          const skuUpper = sku.toUpperCase();
          
          if (!skuToImages.has(skuLower)) {
            skuToImages.set(skuLower, []);
          }
          skuToImages.get(skuLower)!.push(image);
          
          if (!skuToImages.has(skuUpper)) {
            skuToImages.set(skuUpper, []);
          }
          skuToImages.get(skuUpper)!.push(image);
        }
      }
      
      addLog('info', `📊 Created ${skuToImages.size} SKU mappings from ${images.length} images`);
      
      // Step 4: Link products to images
      setProgress(prev => ({ 
        ...prev, 
        status: 'linking',
        currentStep: 'Linking products to images',
        total: products.length 
      }));
      
      let successCount = 0;
      let failCount = 0;
      const batchSize = config.batchSize;
      
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, Math.min(i + batchSize, products.length));
        
        await Promise.all(batch.map(async (product) => {
          try {
            setProgress(prev => ({ 
              ...prev, 
              currentItem: `Processing ${product.sku}`,
              processed: prev.processed + 1
            }));
            
            // Find matching images
            const matchingImages = skuToImages.get(product.sku) || 
                                 skuToImages.get(product.sku.toLowerCase()) ||
                                 skuToImages.get(product.sku.toUpperCase()) ||
                                 [];
            
            if (matchingImages.length === 0) {
              // Try fuzzy matching if enabled
              if (config.matchingStrategy !== 'exact') {
                for (const [sku, imgs] of skuToImages.entries()) {
                  const confidence = calculateConfidence(product.sku, sku, imgs[0]?.filename || '');
                  if (confidence >= config.confidenceThreshold) {
                    matchingImages.push(...imgs);
                    break;
                  }
                }
              }
            }
            
            if (matchingImages.length > 0) {
              // Sort by confidence and take the best match
              const bestMatch = matchingImages.sort((a, b) => {
                const confA = Math.max(...a.extractedSkus.map(s => 
                  calculateConfidence(product.sku, s, a.filename)
                ));
                const confB = Math.max(...b.extractedSkus.map(s => 
                  calculateConfidence(product.sku, s, b.filename)
                ));
                return confB - confA;
              })[0];
              
              if (bestMatch && bestMatch.url) {
                // Check if image already exists
                if (config.skipExisting) {
                  const { data: existing } = await supabase
                    .from('product_images')
                    .select('id')
                    .eq('product_id', product.id)
                    .eq('image_url', bestMatch.url)
                    .maybeSingle();
                  
                  if (existing) {
                    addLog('info', `⏭️ Skipping ${product.sku} - image already linked`);
                    successCount++;
                    return;
                  }
                }
                
                // Check if product has primary image
                const { data: hasPrimary } = await supabase
                  .from('product_images')
                  .select('id')
                  .eq('product_id', product.id)
                  .eq('is_primary', true)
                  .maybeSingle();
                
                // Insert the image link
                const { error: insertError } = await supabase
                  .from('product_images')
                  .insert({
                    product_id: product.id,
                    image_url: bestMatch.url,
                    alt_text: `${product.name} - ${product.sku}`,
                    is_primary: config.autoSetPrimary && !hasPrimary,
                    sort_order: 0
                  });
                
                if (insertError) {
                  throw insertError;
                }
                
                successCount++;
                addLog('success', `✅ Linked ${product.sku} to ${bestMatch.filename}`);
                setProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
              } else {
                failCount++;
                addLog('warn', `❌ No URL for image matching ${product.sku}`);
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
              }
            } else {
              failCount++;
              addLog('warn', `❌ No matching image found for ${product.sku}`);
              setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            }
          } catch (error) {
            failCount++;
            addLog('error', `Failed to link ${product.sku}: ${error.message}`);
            setProgress(prev => ({ 
              ...prev, 
              failed: prev.failed + 1,
              errors: [...prev.errors, `${product.sku}: ${error.message}`]
            }));
          }
        }));
        
        // Small delay between batches
        if (i + batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Final summary
      setProgress(prev => ({ 
        ...prev, 
        status: 'completed',
        currentStep: `Linking complete: ${successCount} successful, ${failCount} failed`
      }));
      
      addLog('success', '🎉 Image linking process completed!');
      addLog('info', `📊 Final results: ${successCount} linked, ${failCount} failed out of ${products.length} products`);
      
      toast.success(`Successfully linked ${successCount} products to images!`);
      
      // Reload stats
      await loadProductsWithoutImages();
      
    } catch (error) {
      addLog('error', `Fatal error: ${error.message}`);
      setProgress(prev => ({ 
        ...prev, 
        status: 'error',
        currentStep: `Error: ${error.message}`
      }));
      toast.error(`Linking failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, config, addLog, scanCompleteStorage, loadProductsWithoutImages, calculateConfidence]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`image-linking-${Date.now()}`)
      .on('broadcast', { event: 'linking_progress' }, (payload) => {
        if (payload.payload) {
          setProgress(payload.payload);
        }
      })
      .on('broadcast', { event: 'linking_log' }, (payload) => {
        if (payload.payload) {
          addLog(payload.payload.level, payload.payload.message, payload.payload.details);
        }
      })
      .subscribe();
    
    setRealtimeChannel(channel);
    
    return () => {
      channel.unsubscribe();
    };
  }, [addLog]);

  // Load initial data
  useEffect(() => {
    loadProductsWithoutImages();
  }, []);

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  const getStatusIcon = (status: LinkingProgress['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'linking': return <Link className="h-4 w-4 text-blue-500" />;
      case 'scanning': return <Search className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</div>
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
                <div className="text-2xl font-bold">{stats.productsWithImages.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Have Images</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.productsWithoutImages.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Need Images</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{storageImages.length.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Storage Images</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Image Linking Control Panel
              </CardTitle>
              <CardDescription>
                Link products to images from storage with intelligent SKU matching
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={startLinkingProcess} 
                  disabled={isRunning}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Start Linking Process
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await scanCompleteStorage();
                    await loadProductsWithoutImages();
                  }}
                  disabled={isRunning}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
                
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(progress.status)}
                  {progress.status}
                </Badge>
              </div>

              {/* Progress Display */}
              {progress.status !== 'idle' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{progress.currentStep}</span>
                      <span>{progress.processed}/{progress.total}</span>
                    </div>
                    <Progress value={getProgressPercentage()} />
                  </div>

                  {progress.currentItem && (
                    <p className="text-sm text-muted-foreground">
                      Processing: {progress.currentItem}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{progress.successful}</div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{progress.failed}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{progress.processed}</div>
                      <div className="text-sm text-muted-foreground">Processed</div>
                    </div>
                  </div>

                  {progress.errors.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>Errors:</strong>
                          <ul className="mt-1 list-disc list-inside">
                            {progress.errors.slice(0, 5).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Linking Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scan All Folders</Label>
                    <p className="text-xs text-muted-foreground">
                      Scan entire storage bucket recursively
                    </p>
                  </div>
                  <Switch
                    checked={config.scanAllFolders}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, scanAllFolders: checked }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Matching Strategy</Label>
                  <Select 
                    value={config.matchingStrategy} 
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, matchingStrategy: value }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">Exact Match Only</SelectItem>
                      <SelectItem value="fuzzy">Fuzzy Matching (Recommended)</SelectItem>
                      <SelectItem value="aggressive">Aggressive Matching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select 
                    value={config.batchSize.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, batchSize: parseInt(value) }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 (Slower, More Reliable)</SelectItem>
                      <SelectItem value="10">10 (Balanced)</SelectItem>
                      <SelectItem value="20">20 (Faster)</SelectItem>
                      <SelectItem value="50">50 (Fastest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Confidence Threshold (%)</Label>
                  <Input
                    type="number"
                    min="50"
                    max="100"
                    value={config.confidenceThreshold}
                    onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip Existing Images</Label>
                    <p className="text-xs text-muted-foreground">
                      Don't re-link products that already have images
                    </p>
                  </div>
                  <Switch
                    checked={config.skipExisting}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, skipExisting: checked }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Set Primary</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically set first image as primary
                    </p>
                  </div>
                  <Switch
                    checked={config.autoSetPrimary}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoSetPrimary: checked }))}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Storage Images
                <Badge variant="outline">{storageImages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storageStats && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-bold">{storageStats.totalImages}</div>
                      <div className="text-muted-foreground">Total Images</div>
                    </div>
                    <div>
                      <div className="font-bold">{storageStats.totalFolders}</div>
                      <div className="text-muted-foreground">Folders</div>
                    </div>
                    <div>
                      <div className="font-bold">{Object.keys(storageStats.imagesPerFolder).length}</div>
                      <div className="text-muted-foreground">Active Folders</div>
                    </div>
                    <div>
                      <div className="font-bold">{storageStats.lastScanTime ? new Date(storageStats.lastScanTime).toLocaleTimeString() : 'Never'}</div>
                      <div className="text-muted-foreground">Last Scan</div>
                    </div>
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {storageImages.slice(0, 100).map((image, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{image.filename}</div>
                        <div className="text-xs text-muted-foreground">{image.path}</div>
                        {image.extractedSkus.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {image.extractedSkus.slice(0, 5).map((sku, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {sku}
                              </Badge>
                            ))}
                            {image.extractedSkus.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{image.extractedSkus.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {storageImages.length > 100 && (
                    <div className="text-center text-muted-foreground py-4">
                      Showing first 100 of {storageImages.length} images
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Products Without Images
                <Badge variant="outline">{productsWithoutImages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {productsWithoutImages.slice(0, 100).map((product, index) => (
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
                  {productsWithoutImages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      🎉 All products have images!
                    </div>
                  )}
                  {productsWithoutImages.length > 100 && (
                    <div className="text-center text-muted-foreground py-4">
                      Showing first 100 of {productsWithoutImages.length} products
                    </div>
                  )}
                </div>
              </ScrollArea>
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
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {processLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg border text-sm">
                      {log.level === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                      {log.level === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                      {log.level === 'warn' && <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                      {log.level === 'info' && <Activity className="h-4 w-4 text-blue-500 mt-0.5" />}
                      <div className="flex-1">
                        <div>{log.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {processLogs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No logs yet. Start the linking process to see activity.
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