import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, RefreshCw, Activity, CheckCircle, AlertCircle, 
  Image as ImageIcon, Loader2, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConsolidatedResult {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  productsScanned: number;
  imagesScanned: number;
  directLinksCreated: number;
  candidatesCreated: number;
  imagesCleared?: number;
  errors: string[];
  startTime: string;
  endTime?: string;
  totalTime?: number;
  debugInfo?: any;
}

export const ConsolidatedImageLinker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ConsolidatedResult | null>(null);
  const { toast } = useToast();

  const startConsolidatedProcessing = async (refreshMode: boolean = false) => {
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🚀 Starting consolidated processing...');
      
      toast({
        title: refreshMode ? "Complete Refresh Started" : "Image Linking Started",  
        description: refreshMode 
          ? "Clearing existing images and performing comprehensive scan..."
          : "Scanning storage images and linking to products...",
      });

      const { data, error } = await supabase.functions.invoke('consolidated-image-linker', {
        body: { 
          completeRefresh: refreshMode 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setResult(data);
      
      if (data.status === 'completed') {
        const successRate = data.productsScanned > 0 ? 
          Math.round(((data.directLinksCreated + data.candidatesCreated) / data.productsScanned) * 100) : 0;
          
        toast({
          title: refreshMode ? "Complete Refresh Finished" : "Processing Complete",
          description: `Found ${data.imagesScanned} images, created ${data.directLinksCreated} direct links and ${data.candidatesCreated} candidates. Success rate: ${successRate}%`,
        });
      } else if (data.status === 'failed') {
        toast({
          title: "Processing Failed",
          description: data.errors?.[0] || "Unknown error occurred",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Consolidated processing error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start processing",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setIsRunning(false);
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Enhanced Image Linking System
          {isRunning && (
            <Badge variant="outline" className="bg-blue-500 text-white">
              Processing
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Advanced SKU pattern recognition with comprehensive matching algorithms.
          Now includes complete refresh capability to clear existing images and re-scan everything.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Features:</strong> Handles 20+ SKU patterns including exact numeric, alphanumeric, 
            multi-SKU files, zero-padding variations, fuzzy matching, and complete product refresh mode.
          </AlertDescription>
        </Alert>

        {/* Processing Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => startConsolidatedProcessing(false)} 
              disabled={isRunning}
              className="flex items-center gap-2"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Link Images to Products
                </>
              )}
            </Button>

            <Button 
              onClick={() => startConsolidatedProcessing(true)} 
              disabled={isRunning}
              variant="destructive"
              className="flex items-center gap-2"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Complete Refresh
                </>
              )}
            </Button>

            {result && (
              <Button 
                onClick={clearResults}
                variant="outline"
                size="lg"
              >
                Clear Results
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Link Images:</strong> Scans storage and links images to products without clearing existing data.</p>
            <p><strong>Complete Refresh:</strong> Clears ALL existing product images first, then performs comprehensive scan.</p>
          </div>
        </div>

        {/* Processing Steps Visualization */}
        {isRunning && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="font-medium">Step 1: Initialize & Clear (if refresh)</div>
                <div className="text-sm text-muted-foreground">
                  Loading products and optionally clearing existing images
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Activity className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <div className="font-medium">Step 2: Comprehensive SKU Extraction</div>
                <div className="text-sm text-muted-foreground">
                  Analyzing filenames with 8 different extraction strategies
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <div className="font-medium">Step 3: Advanced Product Matching</div>
                <div className="text-sm text-muted-foreground">
                  Using 6 matching strategies including fuzzy matching
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.productsScanned}</div>
                <div className="text-sm text-muted-foreground">Products Scanned</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{result.imagesScanned}</div>
                <div className="text-sm text-muted-foreground">Images Scanned</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.directLinksCreated}</div>
                <div className="text-sm text-muted-foreground">Direct Links</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{result.candidatesCreated}</div>
                <div className="text-sm text-muted-foreground">Candidates</div>
              </div>
            </div>

            {result.imagesCleared !== undefined && (
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.imagesCleared}</div>
                <div className="text-sm text-muted-foreground">Images Cleared (Complete Refresh)</div>
              </div>
            )}

            {/* Status and Time */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {result.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : result.status === 'failed' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                )}
                <span className="font-medium capitalize">{result.status}</span>
              </div>
              {result.totalTime && (
                <span className="text-sm text-muted-foreground">
                  Total time: {formatTime(result.totalTime)}
                </span>
              )}
            </div>

            {/* Debug Info */}
            {result.debugInfo?.packagingProducts && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Packaging Matches</h4>
                <div className="text-sm space-y-1">
                  {result.debugInfo.packagingProducts.map((product: any, index: number) => (
                    <div key={index} className="text-blue-700 dark:text-blue-300">
                      {product.sku}: {product.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Errors</h4>
                <div className="text-sm space-y-1">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-red-600 font-medium">
                      ... and {result.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success Message */}
            {result.status === 'completed' && (result.directLinksCreated > 0 || result.candidatesCreated > 0) && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">
                    Successfully processed {result.imagesScanned} images and created {result.directLinksCreated + result.candidatesCreated} total matches!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};