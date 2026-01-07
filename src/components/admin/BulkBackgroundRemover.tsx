import { useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBackgroundRemoval } from "@/contexts/BackgroundRemovalContext";
import { Trash2, Download, RefreshCw, Settings, Play, Square, RotateCcw, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { BackgroundRemovalDiagnostics } from "./BackgroundRemovalDiagnostics";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  image_status: string;
  products?: {
    id: string;
    name: string;
    sku: string;
  };
}

const BulkBackgroundRemover = () => {
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    items,
    isProcessing,
    currentBatch,
    totalBatches,
    stats,
    settings,
    addImages,
    startProcessing,
    stopProcessing,
    clearItems,
    removeItem,
    retryFailedItems,
    updateSettings
  } = useBackgroundRemoval();

  const { imageType, quality, preserveDetails, batchSize, delayBetweenBatches, delayBetweenItems, maxRetries } = settings;

  // Fetch all product images
  const { data: productImages, isLoading } = useQuery({
    queryKey: ['product-images-for-bg-removal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select(`
          id,
          image_url,
          alt_text,
          image_status,
          products (
            id,
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProductImage[];
    },
  });

  // Add unprocessed images to batch processor when images load
  React.useEffect(() => {
    if (productImages) {
      const unprocessedImages = productImages.filter(
        img => img.image_status !== 'background_removed'
      );
      
      addImages(unprocessedImages);
    }
  }, [productImages, addImages]);

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading images...</div>;
  }

  const totalImages = productImages?.length || 0;
  const processedImages = productImages?.filter(img => img.image_status === 'background_removed').length || 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{processedImages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Progress */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Batch Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Batch {currentBatch} of {totalBatches}</span>
                <span>{stats.progress}% Complete</span>
              </div>
              <Progress value={stats.progress} className="w-full" />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Processing in batches of {batchSize} with {delayBetweenBatches/1000}s delay between batches
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Diagnostics */}
      <BackgroundRemovalDiagnostics />

      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Batch Background Removal
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="ml-auto"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </CardTitle>
          <CardDescription>
            Process images in optimized batches to prevent browser overload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Panel */}
          {showSettings && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Batch Processing Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Size: {batchSize}</Label>
                    <Slider
                      value={[batchSize]}
                      onValueChange={([value]) => updateSettings({ batchSize: value })}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of images to process simultaneously
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delay Between Batches: {delayBetweenBatches/1000}s</Label>
                    <Slider
                      value={[delayBetweenBatches]}
                      onValueChange={([value]) => updateSettings({ delayBetweenBatches: value })}
                      min={500}
                      max={10000}
                      step={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      Rest time between batches to prevent overload
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delay Between Items: {delayBetweenItems}ms</Label>
                    <Slider
                      value={[delayBetweenItems]}
                      onValueChange={([value]) => updateSettings({ delayBetweenItems: value })}
                      min={0}
                      max={2000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delay between individual items in a batch
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max Retries: {maxRetries}</Label>
                    <Slider
                      value={[maxRetries]}
                      onValueChange={([value]) => updateSettings({ maxRetries: value })}
                      min={0}
                      max={5}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum retry attempts for failed items
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="image-type">Image Type</Label>
              <Select value={imageType} onValueChange={(value) => updateSettings({ imageType: value as 'general' | 'portrait' | 'product' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product Images</SelectItem>
                  <SelectItem value="portrait">Portrait/People</SelectItem>
                  <SelectItem value="general">General Objects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">Processing Quality</Label>
              <Select value={quality} onValueChange={(value) => updateSettings({ quality: value as 'fast' | 'balanced' | 'high' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (Lower Quality)</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="high">High Quality (Slower)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="preserve-details"
                checked={preserveDetails}
                onCheckedChange={(checked) => updateSettings({ preserveDetails: checked })}
              />
              <Label htmlFor="preserve-details">
                Preserve fine details
              </Label>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 flex-wrap">
            {!isProcessing ? (
              <Button 
                onClick={startProcessing}
                disabled={stats.pending === 0}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Batch Processing ({stats.pending} items)
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={stopProcessing}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Processing
              </Button>
            )}
            
            {stats.failed > 0 && (
              <Button 
                variant="outline"
                onClick={retryFailedItems}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Failed ({stats.failed})
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={clearItems}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue Display */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
            <CardDescription>
              Monitor individual image processing status in the current batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.slice(0, 50).map((item) => {
                const image = item.data;
                const isProcessed = image.image_status === 'background_removed';
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <img 
                        src={image.image_url} 
                        alt={image.alt_text} 
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          {image.products?.name || 'Unknown Product'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {image.products?.sku}
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-500 mt-1">
                            Error: {item.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'processing' && (
                        <div className="w-32">
                          <Progress value={item.progress} className="h-2" />
                          <p className="text-xs text-center mt-1">{item.progress}%</p>
                        </div>
                      )}
                      
                      <Badge variant={
                        isProcessed || item.status === 'completed' ? 'default' : 
                        item.status === 'processing' ? 'secondary' :
                        item.status === 'error' ? 'destructive' : 'outline'
                      }>
                        {isProcessed || item.status === 'completed' ? 'Processed' :
                         item.status === 'processing' ? 'Processing' :
                         item.status === 'error' ? 'Error' : 'Pending'}
                      </Badge>

                      {(isProcessed || item.status === 'completed') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(image.image_url, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.length > 50 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  Showing first 50 items. {items.length - 50} more in queue.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkBackgroundRemover;