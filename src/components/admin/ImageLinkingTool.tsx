// src/components/admin/ImageLinkingTool.tsx
import { useState, useEffect, useCallback, useRef } from "react";
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
  Link,
  Download,
  Upload
} from "lucide-react";
import { SKUMatcher, ExtractedSKU, MatchResult } from "@/utils/skuMatcher";

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
  extractedSkus: ExtractedSKU[];
  size?: number;
  lastModified?: string;
  url?: string;
  bestMatch?: MatchResult;
}

interface ProductWithoutImage {
  id: string;
  sku: string;
  name: string;
  category?: string;
}

interface LinkingConfig {
  scanAllFolders: boolean;
  targetFolder: string;
  matchingStrategy: 'exact' | 'fuzzy' | 'smart';
  batchSize: number;
  skipExisting: boolean;
  autoSetPrimary: boolean;
  confidenceThreshold: number;
  useEdgeFunction: boolean;
  maxImages: number;
}

interface StorageStats {
  totalImages: number;
  totalFolders: number;
  imagesPerFolder: Record<string, number>;
  lastScanTime?: string;
  skuDistribution: Record<string, number>;
}

interface ImageLinkingToolProps {
  onNavigateToScanner?: () => void;
}

export const ImageLinkingTool = ({ onNavigateToScanner }: ImageLinkingToolProps = {}) => {
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
    targetFolder: '',
    matchingStrategy: 'smart',
    batchSize: 10,
    skipExisting: true,
    autoSetPrimary: true,
    confidenceThreshold: 60,
    useEdgeFunction: true,
    maxImages: 5000
  });

  const [activeTab, setActiveTab] = useState('control');
  const skuMatcher = useRef(new SKUMatcher());
  const abortController = useRef<AbortController | null>(null);

  // Add log entry
  const addLog = useCallback((level: ProcessLog['level'], message: string, details?: any) => {
    const newLog: ProcessLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setProcessLogs(prev => [newLog, ...prev.slice(0, 999)]); // Keep last 1000 logs
    
    // Also log to console for debugging
    const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[logMethod](`[${level.toUpperCase()}] ${message}`, details || '');
  }, []);

  // Comprehensive storage scan
  const scanCompleteStorage = useCallback(async (signal?: AbortSignal) => {
    addLog('info', '🔍 Starting comprehensive storage scan...');
    setProgress(prev => ({ ...prev, status: 'scanning', currentStep: 'Scanning storage bucket' }));
    
    const allImages: StorageImage[] = [];
    const folderStats: Record<string, number> = {};
    const skuDistribution: Record<string, number> = {};
    let totalFolders = 0;
    
    try {
      // Recursive function to scan all directories
      const scanDirectory = async (path: string = '', depth: number = 0): Promise<void> => {
        if (signal?.aborted) throw new Error('Scan aborted by user');
        
        if (depth > 10) {
          addLog('warn', `Max depth reached at path: ${path}`);
          return;
        }
        
        let offset = 0;
        let hasMore = true;
        const limit = 100; // Smaller batches for better progress tracking
        let folderImageCount = 0;
        
        while (hasMore && allImages.length < config.maxImages) {
          if (signal?.aborted) throw new Error('Scan aborted by user');
          
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
              
              // Check if it's a directory (no file ID and no extension)
              const isDirectory = !file.id && !file.metadata && !file.name.includes('.');
              
              if (isDirectory) {
                totalFolders++;
                addLog('info', `📁 Found subdirectory: ${fullPath}`);
                // Recursively scan subdirectory
                await scanDirectory(fullPath, depth + 1);
              } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                // It's an image file
                const extractedSkus = skuMatcher.current.extractSKUs(file.name, fullPath);
                
                if (extractedSkus.length > 0) {
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
                  
                  // Update SKU distribution stats
                  extractedSkus.forEach(sku => {
                    skuDistribution[sku.value] = (skuDistribution[sku.value] || 0) + 1;
                  });
                  
                  // Log detailed extraction for debugging
                  if (extractedSkus.length > 1) {
                    addLog('info', `📸 Multi-SKU image: ${file.name} → [${extractedSkus.map(s => `${s.value}(${s.confidence}%)`).join(', ')}]`);
                  }
                  
                  // Update progress every 50 images
                  if (allImages.length % 50 === 0) {
                    setProgress(prev => ({ 
                      ...prev, 
                      currentStep: `Scanning: ${allImages.length} images found`,
                      total: allImages.length 
                    }));
                  }
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
          } catch (error: any) {
            addLog('error', `Error scanning at offset ${offset}: ${error.message}`);
            if (error.message === 'Scan aborted by user') throw error;
            hasMore = false;
          }
        }
        
        if (folderImageCount > 0) {
          folderStats[path || 'root'] = folderImageCount;
        }
      };
      
      // Start scanning based on configuration
      if (config.scanAllFolders || !config.targetFolder) {
        await scanDirectory('');
      } else {
        await scanDirectory(config.targetFolder);
      }
      
      setStorageImages(allImages);
      setStorageStats({
        totalImages: allImages.length,
        totalFolders,
        imagesPerFolder: folderStats,
        lastScanTime: new Date().toISOString(),
        skuDistribution
      });
      
      addLog('success', `✅ Storage scan complete: ${allImages.length} images with SKUs found across ${totalFolders} folders`);
      
      // Log folder statistics
      Object.entries(folderStats).forEach(([folder, count]) => {
        if (count > 0) {
          addLog('info', `📊 ${folder}: ${count} images`);
        }
      });
      
      // Log top SKUs found
      const topSkus = Object.entries(skuDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (topSkus.length > 0) {
        addLog('info', `🔝 Top SKUs: ${topSkus.map(([sku, count]) => `${sku}(${count})`).join(', ')}`);
      }
      
      return allImages;
    } catch (error: any) {
      if (error.message === 'Scan aborted by user') {
        addLog('warn', '⏹️ Storage scan aborted by user');
      } else {
        addLog('error', `Storage scan failed: ${error.message}`);
      }
      throw error;
    }
  }, [config, addLog]);

  // Load products without images
  const loadProductsWithoutImages = useCallback(async () => {
    addLog('info', '📦 Loading products from database...');
    
    try {
      // Get all active products with SKUs
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, categories(name)')
        .not('sku', 'is', null)
        .eq('is_active', true)
        .order('sku', { ascending: true });
      
      if (productsError) throw productsError;
      
      // Get products that already have images
      const { data: productsWithImages, error: imagesError } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('is_primary', true);
      
      if (imagesError) throw imagesError;
      
      const productsWithImageIds = new Set(productsWithImages?.map(p => p.product_id) || []);
      
      // Filter out products that already have images (if skipExisting is true)
      const productsNeedingImages = allProducts?.filter(p => 
        config.skipExisting ? !productsWithImageIds.has(p.id) && p.sku : p.sku
      ).map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.categories?.name
      })) || [];
      
      setProductsWithoutImages(productsNeedingImages);
      
      // Build product index for fast lookup
      skuMatcher.current.buildProductIndex(allProducts || []);
      
      setStats({
        totalProducts: allProducts?.length || 0,
        productsWithImages: productsWithImageIds.size,
        productsWithoutImages: productsNeedingImages.length,
        totalStorageImages: storageImages.length
      });
      
      addLog('success', `✅ Found ${allProducts?.length || 0} total products, ${productsNeedingImages.length} need images`);
      
      return productsNeedingImages;
    } catch (error: any) {
      addLog('error', `Failed to load products: ${error.message}`);
      throw error;
    }
  }, [config.skipExisting, storageImages.length, addLog]);

  // Use Edge Function for linking
  const linkUsingEdgeFunction = useCallback(async () => {
    addLog('info', '🚀 Starting image linking via Edge Function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('link-product-images', {
        body: {
          bucketName: 'product-images',
          confidenceThreshold: config.confidenceThreshold,
          batchSize: config.batchSize,
          skipExisting: config.skipExisting,
          scanPath: config.targetFolder || '',
          limit: config.maxImages
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        addLog('success', `✅ Edge Function completed: ${data.stats.successfulLinks} products linked`);
        
        setStats({
          totalProducts: data.stats.productsFound,
          productsWithImages: data.stats.successfulLinks,
          productsWithoutImages: data.stats.productsFound - data.stats.successfulLinks,
          totalStorageImages: data.stats.imagesScanned
        });
        
        setProgress({
          status: 'completed',
          currentStep: `Completed: ${data.stats.successfulLinks} products linked`,
          processed: data.stats.matchesFound,
          successful: data.stats.successfulLinks,
          failed: data.stats.errors,
          total: data.stats.matchesFound,
          errors: data.errors || []
        });
        
        // Log any errors from the Edge Function
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: string) => addLog('error', error));
        }
        
        toast.success(`Successfully linked ${data.stats.successfulLinks} products to images!`);
      } else {
        throw new Error(data?.error || 'Edge Function failed');
      }
    } catch (error: any) {
      addLog('error', `Edge Function error: ${error.message}`);
      throw error;
    }
  }, [config, addLog]);

  // Main linking process (local)
  const startLinkingProcess = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    abortController.current = new AbortController();
    
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
      // Use Edge Function if enabled
      if (config.useEdgeFunction) {
        await linkUsingEdgeFunction();
        return;
      }
      
      // Otherwise, run locally
      addLog('info', '🚀 Starting local image linking process...');
      
      // Step 1: Scan storage
      const images = await scanCompleteStorage(abortController.current.signal);
      
      // Step 2: Load products
      const products = await loadProductsWithoutImages();
      
      if (products.length === 0) {
        addLog('info', '🎉 All products already have images!');
        setProgress(prev => ({ ...prev, status: 'completed', currentStep: 'All products have images' }));
        return;
      }
      
      // Step 3: Match products to images
      addLog('info', '🧠 Building intelligent SKU matches...');
      setProgress(prev => ({ 
        ...prev, 
        status: 'linking',
        currentStep: 'Matching products to images',
        total: products.length 
      }));
      
      const matches: Array<{product: ProductWithoutImage, image: StorageImage, score: number}> = [];
      
      for (const product of products) {
        if (abortController.current.signal.aborted) {
          throw new Error('Process aborted by user');
        }
        
        let bestMatch: StorageImage | null = null;
        let bestScore = 0;
        
        for (const image of images) {
          const score = skuMatcher.current.calculateMatchScore(product.sku, image.extractedSkus);
          
          if (score > bestScore && score >= config.confidenceThreshold) {
            bestScore = score;
            bestMatch = image;
          }
        }
        
        if (bestMatch) {
          matches.push({ product, image: bestMatch, score: bestScore });
          addLog('success', `✅ Matched ${product.sku} → ${bestMatch.filename} (confidence: ${bestScore}%)`);
        } else {
          addLog('warn', `❌ No match found for ${product.sku}`);
        }
      }
      
      addLog('info', `📊 Found ${matches.length} matches above ${config.confidenceThreshold}% threshold`);
      
      // Step 4: Process matches in batches
      setProgress(prev => ({ 
        ...prev, 
        currentStep: 'Creating image links in database',
        total: matches.length 
      }));
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < matches.length; i += config.batchSize) {
        if (abortController.current.signal.aborted) {
          throw new Error('Process aborted by user');
        }
        
        const batch = matches.slice(i, Math.min(i + config.batchSize, matches.length));
        
        await Promise.all(batch.map(async (match) => {
          try {
            setProgress(prev => ({ 
              ...prev, 
              currentItem: `Processing ${match.product.sku}`,
              processed: prev.processed + 1
            }));
            
            // Check if product already has an image
            if (config.skipExisting) {
              const { data: existing } = await supabase
                .from('product_images')
                .select('id')
                .eq('product_id', match.product.id)
                .eq('image_url', match.image.url)
                .maybeSingle();
              
              if (existing) {
                addLog('info', `⏭️ Skipping ${match.product.sku} - image already linked`);
                successCount++;
                setProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
                return;
              }
            }
            
            // Check if product has primary image
            const { data: hasPrimary } = await supabase
              .from('product_images')
              .select('id')
              .eq('product_id', match.product.id)
              .eq('is_primary', true)
              .maybeSingle();
            
            // Insert the image link
            const { error: insertError } = await supabase
              .from('product_images')
              .insert({
                product_id: match.product.id,
                image_url: match.image.url,
                alt_text: `${match.product.name} - ${match.product.sku}`,
                is_primary: config.autoSetPrimary && !hasPrimary,
                sort_order: 0
              });
            
            if (insertError) {
              throw insertError;
            }
            
            successCount++;
            addLog('success', `✅ Linked ${match.product.sku} to ${match.image.filename}`);
            setProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
            
          } catch (error: any) {
            failCount++;
            const errorMsg = `${match.product.sku}: ${error.message}`;
            addLog('error', `Failed to link ${errorMsg}`);
            setProgress(prev => ({ 
              ...prev, 
              failed: prev.failed + 1,
              errors: [...prev.errors, errorMsg]
            }));
          }
        }));
        
        // Small delay between batches
        if (i + config.batchSize < matches.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Final summary
      setProgress(prev => ({ 
        ...prev, 
        status: 'completed',
        currentStep: `Linking complete: ${successCount} successful, ${failCount} failed`
      }));
      
      addLog('success', `🎉 Image linking process completed! ${successCount} linked, ${failCount} failed`);
      toast.success(`Successfully linked ${successCount} products to images!`);
      
      // Reload stats
      await loadProductsWithoutImages();
      
    } catch (error: any) {
      if (error.message === 'Process aborted by user') {
        addLog('warn', '⏹️ Linking process aborted by user');
        setProgress(prev => ({ 
          ...prev, 
          status: 'idle',
          currentStep: 'Process aborted'
        }));
      } else {
        addLog('error', `Fatal error: ${error.message}`);
        setProgress(prev => ({ 
          ...prev, 
          status: 'error',
          currentStep: `Error: ${error.message}`
        }));
      }
      toast.error(`Linking failed: ${error.message}`);
    } finally {
      setIsRunning(false);
      abortController.current = null;
    }
  }, [isRunning, config, addLog, scanCompleteStorage, loadProductsWithoutImages, linkUsingEdgeFunction]);

  // Stop the process
  const stopProcess = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      addLog('warn', '🛑 Stopping process...');
    }
  }, [addLog]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setProcessLogs([]);
    addLog('info', '🧹 Logs cleared');
  }, [addLog]);

  // Export logs
  const exportLogs = useCallback(() => {
    const logsText = processLogs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-linking-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Logs exported successfully');
  }, [processLogs]);

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                Enhanced Image Linking Control Panel
              </CardTitle>
              <CardDescription>
                Intelligently link products to images from storage with advanced SKU matching
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Enhanced Features:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Multi-SKU file support (e.g., "319027.319026.PNG")</li>
                    <li>Zero-padding variations (123 ↔ 0123 ↔ 00123)</li>
                    <li>Pattern recognition (SKU-123, ITEM_123, [123])</li>
                    <li>Path-based SKU extraction from folder names</li>
                    <li>Confidence-based matching with configurable threshold</li>
                    <li>Edge Function support for server-side processing</li>
                  </ul>
                </AlertDescription>
              </Alert>

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
                
                {onNavigateToScanner && (
                  <Button 
                    onClick={onNavigateToScanner}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Storage Scanner
                  </Button>
                )}
                
                {isRunning && (
                  <Button 
                    onClick={stopProcess}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Stop
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={async () => {
                    await loadProductsWithoutImages();
                    toast.success('Data refreshed');
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
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>Errors:</strong>
                          <ul className="mt-1 list-disc list-inside">
                            {progress.errors.slice(0, 5).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                          {progress.errors.length > 5 && (
                            <p className="mt-1">...and {progress.errors.length - 5} more</p>
                          )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Use Edge Function</Label>
                      <p className="text-xs text-muted-foreground">
                        Process on server for better performance
                      </p>
                    </div>
                    <Switch
                      checked={config.useEdgeFunction}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useEdgeFunction: checked }))}
                      disabled={isRunning}
                    />
                  </div>

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
                    <Label>Target Folder (optional)</Label>
                    <Input
                      placeholder="e.g., products/2024 or leave empty for all"
                      value={config.targetFolder}
                      onChange={(e) => setConfig(prev => ({ ...prev, targetFolder: e.target.value }))}
                      disabled={isRunning || config.scanAllFolders}
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
                        <SelectItem value="fuzzy">Fuzzy Matching</SelectItem>
                        <SelectItem value="smart">Smart Matching (Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
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
                      min="30"
                      max="100"
                      value={config.confidenceThreshold}
                      onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) }))}
                      disabled={isRunning}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum confidence score required for matching (lower = more matches)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Images to Process</Label>
                    <Input
                      type="number"
                      min="100"
                      max="10000"
                      value={config.maxImages}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxImages: parseInt(e.target.value) }))}
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
              <CardDescription>
                Images found in storage with extracted SKUs
              </CardDescription>
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
                      <div className="font-bold">
                        {storageStats.lastScanTime ? new Date(storageStats.lastScanTime).toLocaleTimeString() : 'Never'}
                      </div>
                      <div className="text-muted-foreground">Last Scan</div>
                    </div>
                  </div>
                </div>
              )}
              
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {storageImages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No images scanned yet. Start the linking process to scan storage.
                    </div>
                  ) : (
                    storageImages.slice(0, 100).map((image, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{image.filename}</div>
                          <div className="text-xs text-muted-foreground">{image.path}</div>
                          {image.extractedSkus.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {image.extractedSkus.slice(0, 5).map((sku, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {sku.value}
                                  <span className="ml-1 opacity-60">({sku.confidence}%)</span>
                                </Badge>
                              ))}
                              {image.extractedSkus.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{image.extractedSkus.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {image.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(image.url, '_blank')}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
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
              <CardDescription>
                Products that need image linking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {productsWithoutImages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      🎉 All products have images!
                    </div>
                  ) : (
                    productsWithoutImages.slice(0, 100).map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div>
                          <div className="font-medium">
                            <Badge variant="outline" className="mr-2">{product.sku}</Badge>
                            {product.name}
                          </div>
                          {product.category && (
                            <Badge variant="secondary" className="text-xs mt-1">{product.category}</Badge>
                          )}
                        </div>
                      </div>
                    ))
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Process Logs
                  <Badge variant="outline">{processLogs.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLogs}
                    disabled={processLogs.length === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogs}
                    disabled={processLogs.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Detailed activity log of the linking process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {processLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No logs yet. Start the linking process to see activity.
                    </div>
                  ) : (
                    processLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded-lg border text-sm hover:bg-muted/50">
                        {log.level === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                        {log.level === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                        {log.level === 'warn' && <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                        {log.level === 'info' && <Activity className="h-4 w-4 text-blue-500 mt-0.5" />}
                        <div className="flex-1">
                          <div className={
                            log.level === 'error' ? 'text-red-600' :
                            log.level === 'warn' ? 'text-yellow-600' :
                            log.level === 'success' ? 'text-green-600' :
                            'text-foreground'
                          }>
                            {log.message}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
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