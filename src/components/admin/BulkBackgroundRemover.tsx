import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import { Trash2, Image, Download, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

const BulkBackgroundRemover = () => {
  const [processing, setProcessing] = useState<Map<string, ProcessingStatus>>(new Map());
  const [autoProcess, setAutoProcess] = useState(false);
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
      return data;
    },
  });

  const processImageMutation = useMutation({
    mutationFn: async ({ imageId, imageUrl }: { imageId: string; imageUrl: string }) => {
      // Update status to processing
      setProcessing(prev => new Map(prev.set(imageId, {
        id: imageId,
        status: 'processing',
        progress: 10,
      })));

      try {
        // Download the image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to download image');
        
        const blob = await response.blob();
        setProcessing(prev => new Map(prev.set(imageId, {
          id: imageId,
          status: 'processing',
          progress: 30,
        })));

        // Load image element
        const imageElement = await loadImage(blob);
        setProcessing(prev => new Map(prev.set(imageId, {
          id: imageId,
          status: 'processing',
          progress: 50,
        })));

        // Remove background
        const processedBlob = await removeBackground(imageElement);
        setProcessing(prev => new Map(prev.set(imageId, {
          id: imageId,
          status: 'processing',
          progress: 80,
        })));

        // Upload processed image
        const fileName = `bg-removed-${Date.now()}-${imageId}.png`;
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
          .eq('id', imageId);

        if (updateError) throw updateError;

        setProcessing(prev => new Map(prev.set(imageId, {
          id: imageId,
          status: 'completed',
          progress: 100,
        })));

        return { imageId, newUrl: publicUrl };
      } catch (error) {
        setProcessing(prev => new Map(prev.set(imageId, {
          id: imageId,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images-for-bg-removal'] });
      toast({
        title: "Background Removed",
        description: "Image background has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'Failed to remove background',
        variant: "destructive",
      });
    },
  });

  const handleProcessImage = async (imageId: string, imageUrl: string) => {
    if (processing.has(imageId)) return;
    
    setProcessing(prev => new Map(prev.set(imageId, {
      id: imageId,
      status: 'pending',
      progress: 0,
    })));

    processImageMutation.mutate({ imageId, imageUrl });
  };

  const handleBulkProcess = async () => {
    if (!productImages) return;
    
    const imagesToProcess = productImages.filter(img => 
      img.image_status !== 'background_removed' && !processing.has(img.id)
    );

    for (const image of imagesToProcess) {
      await handleProcessImage(image.id, image.image_url);
      // Add small delay between requests to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const clearProcessedStatus = () => {
    setProcessing(new Map());
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading images...</div>;
  }

  const totalImages = productImages?.length || 0;
  const processedImages = productImages?.filter(img => img.image_status === 'background_removed').length || 0;
  const currentlyProcessing = Array.from(processing.values()).filter(p => p.status === 'processing').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{currentlyProcessing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalImages - processedImages}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Background Removal</CardTitle>
          <CardDescription>
            Automatically remove backgrounds from all product images using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-process"
              checked={autoProcess}
              onCheckedChange={setAutoProcess}
            />
            <Label htmlFor="auto-process">
              Auto-process new uploads
            </Label>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleBulkProcess}
              disabled={currentlyProcessing > 0}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Process All Remaining
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearProcessedStatus}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Processing Status</CardTitle>
          <CardDescription>
            Monitor the background removal progress for each image
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {productImages?.map((image) => {
              const status = processing.get(image.id);
              const isProcessed = image.image_status === 'background_removed';
              
              return (
                <div key={image.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status && (
                      <div className="w-32">
                        <Progress value={status.progress} className="h-2" />
                        <p className="text-xs text-center mt-1">{status.progress}%</p>
                      </div>
                    )}
                    
                    <Badge variant={
                      isProcessed ? 'default' : 
                      status?.status === 'processing' ? 'secondary' :
                      status?.status === 'error' ? 'destructive' :
                      status?.status === 'completed' ? 'default' : 'outline'
                    }>
                      {isProcessed ? 'Processed' :
                       status?.status === 'processing' ? 'Processing' :
                       status?.status === 'error' ? 'Error' :
                       status?.status === 'completed' ? 'Complete' : 'Pending'}
                    </Badge>

                    {!isProcessed && !status && (
                      <Button 
                        size="sm"
                        onClick={() => handleProcessImage(image.id, image.image_url)}
                        className="flex items-center gap-1"
                      >
                        <Image className="h-3 w-3" />
                        Process
                      </Button>
                    )}

                    {isProcessed && (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkBackgroundRemover;