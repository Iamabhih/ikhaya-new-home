import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, Trash2, Upload, CheckCircle, AlertCircle, 
  Database, Image as ImageIcon, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ProductImageRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState<{
    step: number;
    total: number;
    description: string;
    imagesCleared?: number;
    imagesScanned?: number;
    imagesLinked?: number;
  } | null>(null);
  const { toast } = useToast();

  const handleCompleteRefresh = async () => {
    setIsRefreshing(true);
    setProgress({ step: 0, total: 3, description: "Starting complete refresh..." });
    
    try {
      // Step 1: Clear existing product images
      setCurrentStep("Clearing existing product images...");
      setProgress({ step: 1, total: 3, description: "Removing all existing product images" });
      
      const { data: existingImages, error: fetchError } = await supabase
        .from('product_images')
        .select('id');
      
      if (fetchError) {
        throw new Error(`Failed to fetch existing images: ${fetchError.message}`);
      }

      if (existingImages && existingImages.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) {
          throw new Error(`Failed to clear existing images: ${deleteError.message}`);
        }
        
        setProgress(prev => prev ? { 
          ...prev, 
          imagesCleared: existingImages.length,
          description: `Cleared ${existingImages.length} existing images`
        } : null);
        
        toast({
          title: "Images Cleared",
          description: `Removed ${existingImages.length} existing product images`,
        });
      } else {
        setProgress(prev => prev ? { 
          ...prev, 
          imagesCleared: 0,
          description: "No existing images to clear"
        } : null);
      }

      // Small delay before next step
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Scan storage and link images
      setCurrentStep("Scanning storage bucket and linking images...");
      setProgress(prev => prev ? { 
        ...prev, 
        step: 2, 
        description: "Scanning 'product-images' bucket for all SKU-based images"
      } : null);

      // Get session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Authentication required. Please login and try again.');
      }

      // Call the storage scanner with complete refresh config
      const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-storage-images', {
        body: {
          scanPath: '', // Scan from root
          scanAllFolders: true, // Scan all subdirectories
          bucketName: 'product-images'
        },
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (scanError) {
        throw new Error(`Storage scan failed: ${scanError.message}`);
      }

      if (scanResult) {
        setProgress(prev => prev ? { 
          ...prev, 
          imagesScanned: scanResult.foundImages || 0,
          imagesLinked: scanResult.matchedProducts || 0,
          description: `Found ${scanResult.foundImages || 0} images, linked ${scanResult.matchedProducts || 0} to products`
        } : null);

        if (scanResult.errors && scanResult.errors.length > 0) {
          console.warn('Scan completed with errors:', scanResult.errors);
        }
      }

      // Step 3: Complete
      setCurrentStep("Refresh completed successfully!");
      setProgress(prev => prev ? { 
        ...prev, 
        step: 3, 
        description: "Product image refresh completed"
      } : null);

      toast({
        title: "Refresh Complete",
        description: `Successfully refreshed product images. Found ${scanResult?.foundImages || 0} images, linked ${scanResult?.matchedProducts || 0} to products.`,
      });

    } catch (error) {
      console.error('Complete refresh error:', error);
      setCurrentStep(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStepIcon = (stepNum: number) => {
    if (!progress) return <Loader2 className="h-4 w-4" />;
    
    if (progress.step > stepNum) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (progress.step === stepNum) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    } else {
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Complete Product Image Refresh
          {isRefreshing && (
            <Badge variant="outline" className="bg-blue-500 text-white">
              In Progress
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Clear all existing product images and perform a fresh scan of the 'product-images' storage bucket to link images based on SKU filenames.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This will delete ALL existing product images and re-scan the entire storage bucket. 
            Images are automatically matched to products based on SKU patterns in filenames (e.g., "455123.png" matches SKU "455123").
          </AlertDescription>
        </Alert>

        {/* Progress Steps */}
        {progress && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {getStepIcon(1)}
                <div className="flex-1">
                  <div className="font-medium">Step 1: Clear Existing Images</div>
                  <div className="text-sm text-muted-foreground">
                    {progress.imagesCleared !== undefined 
                      ? `Cleared ${progress.imagesCleared} images`
                      : "Removing all existing product images from database"
                    }
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {getStepIcon(2)}
                <div className="flex-1">
                  <div className="font-medium">Step 2: Scan & Link Images</div>
                  <div className="text-sm text-muted-foreground">
                    {progress.imagesScanned !== undefined 
                      ? `Found ${progress.imagesScanned} images, linked ${progress.imagesLinked} to products`
                      : "Scanning storage bucket and matching images to products"
                    }
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                {getStepIcon(3)}
                <div className="flex-1">
                  <div className="font-medium">Step 3: Complete</div>
                  <div className="text-sm text-muted-foreground">
                    {progress.step >= 3 ? "Refresh completed successfully" : "Finalizing the refresh process"}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Current Status:</span>
              </div>
              <div className="text-sm mt-1">{progress.description}</div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleCompleteRefresh} 
            disabled={isRefreshing}
            className="flex items-center gap-2"
            size="lg"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Start Complete Refresh
              </>
            )}
          </Button>

          {isRefreshing && (
            <div className="text-sm text-muted-foreground">
              {currentStep}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {progress && progress.step >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{progress.imagesCleared || 0}</div>
              <div className="text-sm text-muted-foreground">Images Cleared</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{progress.imagesScanned || 0}</div>
              <div className="text-sm text-muted-foreground">Images Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{progress.imagesLinked || 0}</div>
              <div className="text-sm text-muted-foreground">Images Linked</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};