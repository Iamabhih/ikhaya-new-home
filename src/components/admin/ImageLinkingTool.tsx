import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Image, CheckCircle, XCircle, AlertCircle, FileImage, Database } from "lucide-react";

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

export const ImageLinkingTool = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [lastResults, setLastResults] = useState<any>(null);
  const [stats, setStats] = useState<{
    totalProducts: number;
    productsWithImages: number;
    availableImages: number;
    unlinkedProducts: number;
  } | null>(null);

  const loadStats = async () => {
    try {
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

      // Get available images in storage
      const { data: storageFiles } = await supabase.storage
        .from('product-images')
        .list('MULTI_MATCH_ORGANIZED', { limit: 1000 });

      const availableImages = storageFiles?.length || 0;
      const unlinkedProducts = (totalProducts || 0) - (productsWithImages || 0);

      setStats({
        totalProducts: totalProducts || 0,
        productsWithImages: productsWithImages || 0,
        availableImages,
        unlinkedProducts
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const startImageLinking = async () => {
    setIsRunning(true);
    setProgress(null);
    setLastResults(null);

    try {
      toast.info("Starting enhanced image linking process...");
      
      const { data, error } = await supabase.functions.invoke('migrate-drive-images', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setLastResults(data);
      
      if (data.success) {
        toast.success(`Image linking completed! ${data.results.successful} products linked successfully.`);
        // Reload stats after successful linking
        loadStats();
      } else {
        toast.error(`Image linking failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Image linking error:', error);
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

              {progress.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Recent errors:</p>
                      {progress.errors.slice(-3).map((error, index) => (
                        <p key={index} className="text-xs text-muted-foreground">{error}</p>
                      ))}
                      {progress.errors.length > 3 && (
                        <p className="text-xs text-muted-foreground">...and {progress.errors.length - 3} more</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Enhanced Features</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This enhanced tool provides intelligent image linking with comprehensive SKU pattern matching and detailed progress tracking.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Recursively scans all subfolders in MULTI_MATCH_ORGANIZED</li>
            <li>Enhanced SKU extraction with multiple pattern matching</li>
            <li>Supports various filename formats (455404.jpg, SKU_455404, etc.)</li>
            <li>Real-time progress tracking and detailed logging</li>
            <li>Skips products that already have primary images</li>
            <li>Creates optimized storage URLs for fast loading</li>
            <li>Handles complex filename patterns and multi-SKU images</li>
          </ul>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="font-medium">Supported File Patterns:</p>
            <ul className="list-disc list-inside mt-1 text-xs space-y-1">
              <li>Direct SKU: <code>455404.jpg</code></li>
              <li>With separators: <code>455404-1.png</code>, <code>SKU_455404.jpg</code></li>
              <li>In subfolders: <code>BAKEWARE/455404.jpg</code></li>
              <li>Complex: <code>455100.455101.455102.png</code> (uses first SKU)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};