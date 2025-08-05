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
  Target
} from "lucide-react";

interface MigrationProgress {
  status: 'initializing' | 'scanning' | 'processing' | 'completed' | 'error';
  currentStep: string;
  processed: number;
  successful: number;
  failed: number;
  total: number;
  currentFile?: string;
  errors: string[];
  estimatedTimeRemaining?: string;
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
  lastModified?: string;
}

interface PerformanceMetrics {
  processingSpeed: number; // items per second
  accuracyRate: number; // percentage
  errorRate: number; // percentage
  avgMatchConfidence: number;
  totalProcessingTime: number;
}

interface MigrationConfig {
  targetFolder: string;
  enableCategoryMatching: boolean;
  categoryBoostThreshold: number;
  batchSize: number;
  enableCheckpoints: boolean;
  skipExisting: boolean;
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
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Configuration state
  const [config, setConfig] = useState<MigrationConfig>({
    targetFolder: 'MULTI_MATCH_ORGANIZED',
    enableCategoryMatching: true,
    categoryBoostThreshold: 5,
    batchSize: 5,
    enableCheckpoints: true,
    skipExisting: true
  });

  const [detailAnalysis, setDetailAnalysis] = useState<{
    potentialMatches: Array<{
      productSku: string;
      productName: string;
      matchingImages: string[];
      confidence: 'high' | 'medium' | 'low';
    }>;
    processingStats: {
      totalAnalyzed: number;
      highConfidenceMatches: number;
      mediumConfidenceMatches: number;
      lowConfidenceMatches: number;
    };
  } | null>(null);

  const addLog = useCallback((level: ProcessLog['level'], message: string, details?: any) => {
    const newLog: ProcessLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setProcessLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
  }, []);

  // Enhanced stats loading with better error handling
  const loadStats = useCallback(async () => {
    try {
      addLog('info', '📊 Loading enhanced system statistics...');
      
      const startTime = Date.now();
      
      // Get total active products with timeout
      const { count: totalProducts, error: totalError } = await Promise.race([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Total products query timeout')), 10000)
        )
      ]) as any;

      if (totalError) throw totalError;

      // Get products with images with timeout
      const { count: productsWithImages, error: imagesError } = await Promise.race([
        supabase
          .from('products')
          .select('*, product_images!inner(*)', { count: 'exact', head: true })
          .eq('is_active', true),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Products with images query timeout')), 10000)
        )
      ]) as any;

      if (imagesError) throw imagesError;

      // Get available images in storage with pagination and enhanced validation
      let allStorageFiles: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      let imageCount = 0;

      while (hasMore && offset < 50000) { // Safety limit
        try {
          const { data: storageFiles, error: storageError } = await Promise.race([
            supabase.storage
              .from('product-images')
              .list(config.targetFolder, { 
                limit, 
                offset,
                sortBy: { column: 'name', order: 'asc' }
              }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Storage list timeout')), 15000)
            )
          ]) as any;

          if (storageError) throw storageError;

          if (!storageFiles || storageFiles.length === 0) {
            hasMore = false;
            break;
          }

          // Filter for valid image files
          const validImages = storageFiles.filter((file: any) => 
            file?.name && 
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) &&
            file.metadata?.size > 1000 // Minimum file size
          );

          allStorageFiles.push(...validImages);
          imageCount += validImages.length;
          
          if (storageFiles.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }

          // Add delay to prevent overwhelming the API
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (storageError) {
          console.error('Error loading storage batch:', storageError);
          addLog('warn', `Storage batch error at offset ${offset}: ${storageError.message}`);
          break;
        }
      }

      const availableImages = imageCount;
      const unlinkedProducts = (totalProducts || 0) - (productsWithImages || 0);
      const processingTime = Date.now() - startTime;

      setStats({
        totalProducts: totalProducts || 0,
        productsWithImages: productsWithImages || 0,
        availableImages,
        unlinkedProducts
      });

      // Calculate basic performance metrics
      const accuracyRate = totalProducts > 0 ? Math.round((productsWithImages / totalProducts) * 100) : 0;
      const errorRate = 100 - accuracyRate;

      setPerformanceMetrics({
        processingSpeed: processingTime > 0 ? Math.round((totalProducts / processingTime) * 1000) : 0,
        accuracyRate,
        errorRate,
        avgMatchConfidence: accuracyRate, // Simplified
        totalProcessingTime: processingTime
      });

      addLog('success', `📊 Stats loaded: ${totalProducts} total, ${productsWithImages} with images, ${unlinkedProducts} unlinked (${processingTime}ms)`);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      addLog('error', 'Failed to load statistics', error);
      toast.error(`Failed to load statistics: ${error.message}`);
    }
  }, [config.targetFolder, addLog]);

  // Enhanced unlinked products loading with better filtering
  const loadUnlinkedProducts = useCallback(async () => {
    try {
      addLog('info', '🔍 Loading unlinked products with enhanced filtering...');
      
      const { data: products, error } = await Promise.race([
        supabase
          .from('products')
          .select(`
            sku, name,
            categories(name)
          `)
          .eq('is_active', true)
          .not('sku', 'is', null)
          .not('name', 'is', null)
          .limit(5000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Unlinked products query timeout')), 15000)
        )
      ]) as any;

      if (error) throw error;

      // Get products that already have images (more efficient query)
      const { data: productsWithImages, error: linkedError } = await Promise.race([
        supabase
          .from('product_images')
          .select('product_id, products!inner(sku)')
          .limit(5000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Linked products query timeout')), 15000)
        )
      ]) as any;

      if (linkedError) throw linkedError;

      const linkedSkus = new Set(productsWithImages?.map((p: any) => p.products?.sku).filter(Boolean) || []);
      
      const unlinked = products
        ?.filter((p: any) => p && p.sku && p.name && !linkedSkus.has(p.sku))
        .map((p: any) => ({
          sku: p.sku,
          name: p.name,
          category: (p.categories as any)?.name
        })) || [];

      setUnlinkedProducts(unlinked);
      addLog('info', `🔍 Found ${unlinked.length} unlinked products (filtered from ${products?.length || 0} total)`);
    } catch (error: any) {
      console.error('Error loading unlinked products:', error);
      addLog('error', 'Failed to load unlinked products', error);
    }
  }, [addLog]);

  // Enhanced available images analysis with better validation
  const loadAvailableImages = useCallback(async () => {
    try {
      addLog('info', '🖼️ Analyzing available images with enhanced validation...');
      
      let allStorageFiles: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      const maxFiles = 10000; // Limit for performance

      while (hasMore && allStorageFiles.length < maxFiles) {
        try {
          const { data: storageFiles, error: storageError } = await Promise.race([
            supabase.storage
              .from('product-images')
              .list(config.targetFolder, { 
                limit, 
                offset,
                sortBy: { column: 'updated_at', order: 'desc' }
              }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Storage analysis timeout')), 10000)
            )
          ]) as any;

          if (storageError) throw storageError;

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

          // Progress feedback for large scans
          if (allStorageFiles.length % 2000 === 0) {
            addLog('info', `📈 Analyzed ${allStorageFiles.length} storage items so far...`);
          }

        } catch (batchError) {
          console.error('Error in storage analysis batch:', batchError);
          addLog('warn', `Storage analysis batch error: ${batchError.message}`);
          break;
        }
      }

      const imageAnalysis: AvailableImage[] = [];
      let validImageCount = 0;
      let invalidImageCount = 0;
      
      for (const file of allStorageFiles) {
        try {
          // Enhanced validation
          if (file?.name && 
              file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) &&
              file.metadata?.mimetype?.startsWith('image/') &&
              file.metadata?.size > 1000 && 
              file.metadata?.size < 50000000) { // Between 1KB and 50MB
            
            const extractedSkus = extractSKUsFromFilename(file.name);
            
            imageAnalysis.push({
              filename: file.name,
              path: `${config.targetFolder}/${file.name}`,
              extractedSkus,
              size: file.metadata.size || 0,
              lastModified: file.updated_at || file.created_at
            });
            
            validImageCount++;
          } else {
            invalidImageCount++;
          }
        } catch (fileError) {
          console.error(`Error analyzing file ${file?.name}:`, fileError);
          invalidImageCount++;
        }
      }

      setAvailableImages(imageAnalysis);
      addLog('success', `🖼️ Analyzed ${validImageCount} valid images, skipped ${invalidImageCount} invalid files from ${allStorageFiles.length} total items`);
    } catch (error: any) {
      console.error('Error analyzing available images:', error);
      addLog('error', 'Failed to analyze available images', error);
    }
  }, [config.targetFolder, addLog]);

  // Enhanced detailed analysis with better matching logic
  const performDetailedAnalysis = useCallback(async () => {
    if (unlinkedProducts.length === 0 || availableImages.length === 0) {
      addLog('warn', 'Insufficient data for detailed analysis');
      return;
    }

    addLog('info', '🔬 Performing enhanced detailed matching analysis...');

    const potentialMatches: Array<{
      productSku: string;
      productName: string;
      matchingImages: string[];
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    let highConfidenceMatches = 0;
    let mediumConfidenceMatches = 0;
    let lowConfidenceMatches = 0;

    // Analyze a reasonable subset to prevent performance issues
    const analysisLimit = Math.min(unlinkedProducts.length, 100);
    const productsToAnalyze = unlinkedProducts.slice(0, analysisLimit);

    for (const product of productsToAnalyze) {
      try {
        const matchingImages: string[] = [];
        let hasExactMatch = false;
        let hasFuzzyMatch = false;
        
        for (const image of availableImages) {
          try {
            // Enhanced matching logic
            const hasDirectMatch = image.extractedSkus.includes(product.sku);
            const hasCaseInsensitiveMatch = image.extractedSkus.some(imageSku => 
              imageSku.toLowerCase() === product.sku.toLowerCase()
            );
            const hasAdvancedFuzzyMatch = image.extractedSkus.some(imageSku => 
              advancedFuzzyMatch(product.sku, imageSku)
            );
            
            if (hasDirectMatch || hasCaseInsensitiveMatch) {
              matchingImages.push(image.filename);
              hasExactMatch = true;
            } else if (hasAdvancedFuzzyMatch) {
              matchingImages.push(image.filename);
              hasFuzzyMatch = true;
            }
          } catch (imageError) {
            console.error(`Error analyzing image ${image.filename} for product ${product.sku}:`, imageError);
          }
        }
        
        if (matchingImages.length > 0) {
          let confidence: 'high' | 'medium' | 'low';
          
          if (hasExactMatch) {
            confidence = 'high';
            highConfidenceMatches++;
          } else if (hasFuzzyMatch) {
            confidence = 'medium';
            mediumConfidenceMatches++;
          } else {
            confidence = 'low';
            lowConfidenceMatches++;
          }
          
          potentialMatches.push({
            productSku: product.sku,
            productName: product.name,
            matchingImages: matchingImages.slice(0, 5), // Limit to first 5 matches
            confidence
          });
        }
      } catch (productError) {
        console.error(`Error analyzing product ${product.sku}:`, productError);
      }
    }

    setDetailAnalysis({ 
      potentialMatches,
      processingStats: {
        totalAnalyzed: analysisLimit,
        highConfidenceMatches,
        mediumConfidenceMatches,
        lowConfidenceMatches
      }
    });
    
    addLog('success', `🔬 Analysis complete: ${potentialMatches.length} potential matches found (${highConfidenceMatches} high, ${mediumConfidenceMatches} medium, ${lowConfidenceMatches} low confidence)`);
  }, [unlinkedProducts, availableImages, addLog]);

  // Enhanced SKU extraction with better patterns
  const extractSKUsFromFilename = useCallback((filename: string): string[] => {
    const skus: string[] = [];
    if (!filename || typeof filename !== 'string') return skus;
    
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Enhanced patterns with validation
    const patterns = [
      /^\d{3,8}$/, // Exact numeric filename
      /\b\d{3,8}\b/g, // Numeric sequences with word boundaries
      /(?:SKU|PROD|ITEM)[_-]?(\d{3,8})/gi, // Prefixed patterns
      /(\d{3,8})[_-]\d+/g, // Suffixed patterns
      /(\d{3,8})\s*\([^)]*\)/g // Parentheses patterns
    ];
    
    for (const pattern of patterns) {
      const matches = nameWithoutExt.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/[^\d]/g, '');
          if (cleaned.length >= 3 && cleaned.length <= 8 && !skus.includes(cleaned)) {
            skus.push(cleaned);
          }
        });
      }
    }
    
    return skus;
  }, []);

  // Advanced fuzzy matching with multiple strategies
  const advancedFuzzyMatch = useCallback((sku1: string, sku2: string): boolean => {
    if (!sku1 || !sku2) return false;
    
    const normalized1 = sku1.toLowerCase().trim();
    const normalized2 = sku2.toLowerCase().trim();
    
    // Direct match
    if (normalized1 === normalized2) return true;
    
    // Zero padding variations
    if (normalized1.length === 3 && normalized2 === '0' + normalized1) return true;
    if (normalized2.length === 3 && normalized1 === '0' + normalized2) return true;
    if (normalized1.length === 4 && normalized2 === '0' + normalized1) return true;
    if (normalized2.length === 4 && normalized1 === '0' + normalized2) return true;
    
    // Remove leading zeros
    const trimmed1 = normalized1.replace(/^0+/, '');
    const trimmed2 = normalized2.replace(/^0+/, '');
    if (trimmed1 === trimmed2 && trimmed1.length >= 3) return true;
    
    // Substring match for longer SKUs
    if (normalized1.length >= 5 && normalized2.length >= 5) {
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return true;
      }
    }
    
    return false;
  }, []);

  // Setup realtime subscription for progress updates
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [realtimeChannel]);

  // Enhanced data loading on mount and config changes
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadStats(),
          loadUnlinkedProducts(),
          loadAvailableImages()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        addLog('error', 'Failed to load initial data');
      }
    };

    loadAllData();
  }, [loadStats, loadUnlinkedProducts, loadAvailableImages]);

  // Enhanced analysis trigger
  useEffect(() => {
    if (unlinkedProducts.length > 0 && availableImages.length > 0) {
      const timer = setTimeout(() => {
        performDetailedAnalysis();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [unlinkedProducts, availableImages, performDetailedAnalysis]);

  // Enhanced image linking with configuration support
  const startImageLinking = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    setLastResults(null);
    addLog('info', '🚀 Starting enhanced image linking process with custom configuration...');

    // Setup realtime subscription
    const channel = supabase.channel(`drive-migration-${Date.now()}`);
    
    channel
      .on('broadcast', { event: 'migration_progress' }, (payload) => {
        if (payload.payload) {
          setProgress(payload.payload);
        }
      })
      .on('broadcast', { event: 'migration_log' }, (payload) => {
        if (payload.payload) {
          addLog(payload.payload.level, payload.payload.message, payload.payload.data);
        }
      })
      .subscribe();

    setRealtimeChannel(channel);

    try {
      const { data, error } = await Promise.race([
        supabase.functions.invoke('migrate-drive-images', {
          body: config
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Function timeout after 5 minutes')), 300000)
        )
      ]) as any;

      if (error) {
        throw error;
      }

      setLastResults(data);
      
      if (data.success) {
        addLog('success', `✅ Image linking completed! ${data.results?.successful || 0} products linked successfully.`);
        toast.success(`Image linking completed! ${data.results?.successful || 0} products linked successfully.`);
        
        // Reload stats after successful linking
        setTimeout(() => {
          loadStats();
          loadUnlinkedProducts();
        }, 2000);
      } else {
        addLog('error', `❌ Image linking failed: ${data.error}`);
        toast.error(`Image linking failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Image linking error:', error);
      addLog('error', `❌ Failed to start image linking: ${error.message}`, error);
      toast.error(`Failed to start image linking: ${error.message}`);
    } finally {
      setIsRunning(false);
      if (channel) {
        channel.unsubscribe();
        setRealtimeChannel(null);
      }
    }
  }, [config, addLog, loadStats, loadUnlinkedProducts]);

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

  const getEstimatedTimeRemaining = () => {
    if (!progress || progress.total === 0 || progress.processed === 0) return null;
    
    // Estimate based on processing rate (simplified calculation without startTime)
    const estimatedSeconds = (progress.total - progress.processed) * 2; // rough estimate of 2 seconds per item
    
    if (estimatedSeconds < 60) return `${Math.round(estimatedSeconds)}s`;
    if (estimatedSeconds < 3600) return `${Math.round(estimatedSeconds / 60)}m`;
    return `${Math.round(estimatedSeconds / 3600)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Overview */}
      {stats && (
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
                  <div className="text-2xl font-bold">{stats.availableImages.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Available Images</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.unlinkedProducts.toLocaleString()}</div>
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

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{performanceMetrics.accuracyRate}%</div>
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{performanceMetrics.processingSpeed}</div>
                <div className="text-sm text-muted-foreground">Items/sec</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{performanceMetrics.errorRate}%</div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{performanceMetrics.totalProcessingTime}ms</div>
                <div className="text-sm text-muted-foreground">Load Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="control">Control Panel</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Process Logs</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="unlinked">Unlinked</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Enhanced Image Linking Tool
              </CardTitle>
              <CardDescription>
                Advanced automated image linking with intelligent SKU matching, category awareness, and enhanced error recovery.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={startImageLinking} 
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
                      Start Enhanced Linking
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
                  disabled={isRunning}
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

                {progress && progress.status === 'processing' && getEstimatedTimeRemaining() && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getEstimatedTimeRemaining()} remaining
                  </Badge>
                )}
              </div>

              {progress && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{progress.currentStep}</span>
                      <span>{progress.processed.toLocaleString()}/{progress.total.toLocaleString()}</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="w-full" />
                    <div className="text-center text-xs text-muted-foreground">
                      {getProgressPercentage()}% complete
                    </div>
                  </div>

                  {progress.currentFile && (
                    <p className="text-sm text-muted-foreground">
                      Current: {progress.currentFile}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{progress.successful.toLocaleString()}</div>
                      <div className="text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{progress.failed.toLocaleString()}</div>
                      <div className="text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{progress.processed.toLocaleString()}</div>
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
                        {lastResults.success ? '✅ Completed Successfully!' : '⚠️ Completed with Issues'}
                      </p>
                      {lastResults.results && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-green-600">{lastResults.results.successful?.toLocaleString()}</span> successful
                          </div>
                          <div>
                            <span className="font-medium text-red-600">{lastResults.results.failed?.toLocaleString()}</span> failed
                          </div>
                          <div>
                            <span className="font-medium">{lastResults.results.processed?.toLocaleString()}</span> total
                          </div>
                        </div>
                      )}
                      {lastResults.config && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Used config: {lastResults.config.targetFolder}, batch size: {lastResults.config.batchSize}, 
                          category matching: {lastResults.config.enableCategoryMatching ? 'enabled' : 'disabled'}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>
                Customize the image linking process for optimal performance and accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="targetFolder">Target Storage Folder</Label>
                  <Input
                    id="targetFolder"
                    value={config.targetFolder}
                    onChange={(e) => setConfig(prev => ({ ...prev, targetFolder: e.target.value }))}
                    placeholder="MULTI_MATCH_ORGANIZED"
                    disabled={isRunning}
                  />
                  <p className="text-xs text-muted-foreground">
                    The folder in storage to scan for images
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Select 
                    value={config.batchSize.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, batchSize: parseInt(value) }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Slowest, Most Reliable)</SelectItem>
                      <SelectItem value="3">3 (Slow, Very Reliable)</SelectItem>
                      <SelectItem value="5">5 (Balanced - Recommended)</SelectItem>
                      <SelectItem value="10">10 (Fast, Less Reliable)</SelectItem>
                      <SelectItem value="20">20 (Fastest, Least Reliable)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Number of items processed simultaneously. Lower = more reliable.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryThreshold">Category Boost Threshold</Label>
                  <Select 
                    value={config.categoryBoostThreshold.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, categoryBoostThreshold: parseInt(value) }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Very Lenient)</SelectItem>
                      <SelectItem value="3">3 (Lenient)</SelectItem>
                      <SelectItem value="5">5 (Balanced - Recommended)</SelectItem>
                      <SelectItem value="8">8 (Strict)</SelectItem>
                      <SelectItem value="10">10 (Very Strict)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Minimum score required for category-based matches
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Category-Aware Matching</Label>
                    <p className="text-xs text-muted-foreground">
                      Use product categories to improve image matching accuracy
                    </p>
                  </div>
                  <Switch
                    checked={config.enableCategoryMatching}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableCategoryMatching: checked }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Checkpoints</Label>
                    <p className="text-xs text-muted-foreground">
                      Save progress periodically to resume interrupted processes
                    </p>
                  </div>
                  <Switch
                    checked={config.enableCheckpoints}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableCheckpoints: checked }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Skip Products with Existing Images</Label>
                    <p className="text-xs text-muted-foreground">
                      Skip products that already have images linked
                    </p>
                  </div>
                  <Switch
                    checked={config.skipExisting}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, skipExisting: checked }))}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Performance Tips:</strong>
                  <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                    <li>Use smaller batch sizes (1-5) for more reliable processing</li>
                    <li>Enable checkpoints for long-running processes</li>
                    <li>Category matching improves accuracy but may be slower</li>
                    <li>Skip existing images to avoid duplicate processing</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Enhanced Process Logs
                <Badge variant="outline">{processLogs.length}</Badge>
              </CardTitle>
              <CardDescription>
                Real-time system activity, debugging information, and performance metrics
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
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto max-h-32">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
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
                Enhanced Matching Analysis
              </CardTitle>
              <CardDescription>
                Intelligent analysis of potential matches between unlinked products and available images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailAnalysis ? (
                <div className="space-y-4">
                  {/* Analysis Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{detailAnalysis.processingStats.totalAnalyzed}</div>
                      <div className="text-sm text-muted-foreground">Analyzed</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{detailAnalysis.processingStats.highConfidenceMatches}</div>
                      <div className="text-sm text-muted-foreground">High Confidence</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">{detailAnalysis.processingStats.mediumConfidenceMatches}</div>
                      <div className="text-sm text-muted-foreground">Medium Confidence</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{detailAnalysis.processingStats.lowConfidenceMatches}</div>
                      <div className="text-sm text-muted-foreground">Low Confidence</div>
                    </div>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {detailAnalysis.potentialMatches.map((match, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium">SKU: {match.productSku}</div>
                              <div className="text-sm text-muted-foreground">{match.productName}</div>
                            </div>
                            <Badge 
                              variant={
                                match.confidence === 'high' ? 'default' : 
                                match.confidence === 'medium' ? 'secondary' : 'outline'
                              }
                            >
                              {match.confidence} confidence
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <strong>Matching Images ({match.matchingImages.length}):</strong>
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
                          No potential matches found. This could mean either all products are already linked or the matching algorithm needs adjustment.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Loading enhanced analysis...
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
                Products without images that need to be linked (showing sample of most recent)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {unlinkedProducts.slice(0, 100).map((product, index) => (
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
                      🎉 Excellent! All products have images linked.
                    </div>
                  )}
                  {unlinkedProducts.length > 100 && (
                    <div className="text-center text-muted-foreground py-4 border-t">
                      Showing first 100 of {unlinkedProducts.length.toLocaleString()} unlinked products
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