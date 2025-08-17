import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import { useBatchProcessor } from "@/hooks/useBatchProcessor";
import { Trash2, Image, Download, RefreshCw, Settings, Play, Square, RotateCcw, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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

interface BatchSettings {
  batchSize: number;
  delayBetweenBatches: number;
  delayBetweenItems: number;
  maxRetries: number;
}

const BulkBackgroundRemover = () => {
  const [imageType, setImageType] = useState<'general' | 'portrait' | 'product'>('product');
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'high'>('balanced');
  const [preserveDetails, setPreserveDetails] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    batchSize: 5,
    delayBetweenBatches: 2000, // 2 seconds
    delayBetweenItems: 500,    // 0.5 seconds
    maxRetries: 2
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Background removal processor function
  const processImageFunction = async (
    image: ProductImage, 
    onProgress?: (progress: number) => void
  ) => {
    // Download the image
    const response = await fetch(image.image_url);
    if (!response.ok) throw new Error('Failed to download image');
    
    const blob = await response.blob();
    onProgress?.(20);

    // Load image element
    const imageElement = await loadImage(blob);
    onProgress?.(40);

    // Remove background
    const processedBlob = await removeBackground(imageElement, {
      imageType,
      quality,
      preserveDetails,
      onProgress: (progress) => onProgress?.(40 + (progress * 0.4))
    });
    onProgress?.(80);

    // Upload processed image
    const fileName = `bg-removed-${Date.now()}-${image.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, processedBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Update product image record
    const { error: updateError } = await supabase
      .from('product_images')
      .update({ 
        image_url: publicUrl,
        image_status: 'background_removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', image.id);

    if (updateError) throw updateError;
    onProgress?.(100);

    return { imageId: image.id, newUrl: publicUrl };
  };

  // Initialize batch processor
  const batchProcessor = useBatchProcessor(processImageFunction, {
    batchSize: batchSettings.batchSize,
    delayBetweenBatches: batchSettings.delayBetweenBatches,
    delayBetweenItems: batchSettings.delayBetweenItems,
    maxRetries: batchSettings.maxRetries,
    onBatchStart: (batchIndex, items) => {
      toast({
        title: `Processing Batch ${batchIndex}`,
        description: `Processing ${items.length} images...`,
      });
    },
    onBatchComplete: (batchIndex, results) => {
      const successful = results.filter(r => r !== null).length;
      toast({
        title: `Batch ${batchIndex} Complete`,
        description: `Successfully processed ${successful}/${results.length} images`,
      });
    },
    onItemComplete: (itemId) => {
      queryClient.invalidateQueries({ queryKey: ['product-images-for-bg-removal'] });
    },
    onItemError: (itemId, error) => {
      console.error(`Error processing image ${itemId}:`, error);
    }
  });

  // Add unprocessed images to batch processor when images load
  useEffect(() => {
    if (productImages) {
      const unprocessedImages = productImages.filter(
        img => img.image_status !== 'background_removed'
      );
      
      const batchItems = unprocessedImages.map(img => ({
        id: img.id,
        data: img
      }));
      
      batchProcessor.addItems(batchItems);
    }
  }, [productImages]);

  const handleStartProcessing = () => {
    batchProcessor.startProcessing();
  };

  const handleStopProcessing = () => {
    batchProcessor.stopProcessing();
    toast({
      title: "Processing stopped",
      description: "Batch processing has been cancelled",
      variant: "destructive"
    });
  };

  const handleRetryFailed = () => {
    batchProcessor.retryFailedItems();
    toast({
      title: "Retrying failed items",
      description: "Failed items have been reset for reprocessing",
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading images...</div>;
  }

  const totalImages = productImages?.length || 0;
  const processedImages = productImages?.filter(img => img.image_status === 'background_removed').length || 0;
  const stats = batchProcessor.getStats;

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
      {batchProcessor.isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Batch Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Batch {batchProcessor.currentBatch} of {batchProcessor.totalBatches}</span>
                <span>{stats.progress}% Complete</span>
              </div>
              <Progress value={stats.progress} className="w-full" />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Processing in batches of {batchSettings.batchSize} with {batchSettings.delayBetweenBatches/1000}s delay between batches
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <Label>Batch Size: {batchSettings.batchSize}</Label>
                    <Slider
                      value={[batchSettings.batchSize]}
                      onValueChange={([value]) => setBatchSettings(prev => ({ ...prev, batchSize: value }))}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of images to process simultaneously
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delay Between Batches: {batchSettings.delayBetweenBatches/1000}s</Label>
                    <Slider
                      value={[batchSettings.delayBetweenBatches]}
                      onValueChange={([value]) => setBatchSettings(prev => ({ ...prev, delayBetweenBatches: value }))}
                      min={500}
                      max={10000}
                      step={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      Rest time between batches to prevent overload
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delay Between Items: {batchSettings.delayBetweenItems}ms</Label>
                    <Slider
                      value={[batchSettings.delayBetweenItems]}
                      onValueChange={([value]) => setBatchSettings(prev => ({ ...prev, delayBetweenItems: value }))}
                      min={0}
                      max={2000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delay between individual items in a batch
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max Retries: {batchSettings.maxRetries}</Label>
                    <Slider
                      value={[batchSettings.maxRetries]}
                      onValueChange={([value]) => setBatchSettings(prev => ({ ...prev, maxRetries: value }))}
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
              <Select value={imageType} onValueChange={(value) => setImageType(value as 'general' | 'portrait' | 'product')}>
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
              <Select value={quality} onValueChange={(value) => setQuality(value as 'fast' | 'balanced' | 'high')}>
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
                onCheckedChange={setPreserveDetails}
              />
              <Label htmlFor="preserve-details">
                Preserve fine details
              </Label>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 flex-wrap">
            {!batchProcessor.isProcessing ? (
              <Button 
                onClick={handleStartProcessing}
                disabled={stats.pending === 0}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Batch Processing ({stats.pending} items)
              </Button>
            ) : (
              <Button 
                variant="destructive"
                onClick={handleStopProcessing}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Processing
              </Button>
            )}
            
            {stats.failed > 0 && (
              <Button 
                variant="outline"
                onClick={handleRetryFailed}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Failed ({stats.failed})
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={batchProcessor.clearItems}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Queue Display */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>
            Monitor individual image processing status in the current batch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {batchProcessor.items.slice(0, 50).map((item) => {
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
            {batchProcessor.items.length > 50 && (
              <div className="text-center py-2 text-sm text-muted-foreground">
                Showing first 50 items. {batchProcessor.items.length - 50} more in queue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkBackgroundRemover;