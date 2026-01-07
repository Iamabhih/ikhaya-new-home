import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Scissors, Loader2, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";

interface SystemStatus {
  webgpuSupported: boolean;
  webglSupported: boolean;
  memoryEstimate: number;
  isCompatible: boolean;
}

interface EnhancedBackgroundRemoverProps {
  onProcessed?: (blob: Blob) => void;
  className?: string;
}

export const EnhancedBackgroundRemover = ({ onProcessed, className }: EnhancedBackgroundRemoverProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [processedPreview, setProcessedPreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<string>('');
  const [imageType, setImageType] = useState<'general' | 'portrait' | 'product'>('product');
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'high'>('balanced');
  const [preserveDetails, setPreserveDetails] = useState(true);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  
  const { toast } = useToast();

  // System capability detection
  const checkSystemCapabilities = useCallback(async () => {
    try {
      const webgpuSupported = 'gpu' in navigator;
      let webglSupported = false;
      let memoryEstimate = 0;

      // Check WebGL
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      webglSupported = !!gl;

      // Estimate available memory
      if ('memory' in performance) {
        memoryEstimate = (performance as any).memory?.usedJSHeapSize || 0;
      }

      const status: SystemStatus = {
        webgpuSupported,
        webglSupported,
        memoryEstimate,
        isCompatible: webglSupported || webgpuSupported
      };

      setSystemStatus(status);
      
      if (!status.isCompatible) {
        toast({
          title: "Limited Compatibility",
          description: "Background removal may be slow on this device",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking system capabilities:', error);
    }
  }, [toast]);

  // Initialize on mount
  useState(() => {
    checkSystemCapabilities();
  });

  const addLog = (message: string) => {
    setProcessingLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setOriginalPreview(URL.createObjectURL(file));
    setProcessedPreview("");
    setProcessedBlob(null);
    setProgress(0);
    setProcessingLog([]);
    addLog('Image selected successfully');
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setProcessingLog([]);
    addLog('Starting background removal process');

    try {
      setModelStatus('Loading image...');
      const imageElement = await loadImage(selectedFile);
      addLog('Image loaded successfully');
      
      setModelStatus('Processing with AI model...');
      const processedBlob = await removeBackground(imageElement, {
        imageType,
        quality,
        onProgress: (progress) => {
          setProgress(progress);
          if (progress === 25) addLog('AI model loaded');
          if (progress === 50) addLog('Image preprocessing complete');
          if (progress === 75) addLog('Background segmentation complete');
          if (progress === 95) addLog('Finalizing processed image');
        }
      });
      
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedPreview(processedUrl);
      setProcessedBlob(processedBlob);
      setModelStatus('');
      addLog('Background removal completed successfully');
      
      onProcessed?.(processedBlob);
      
      toast({
        title: "Background removed successfully",
        description: "Your image has been processed",
      });
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Error: ${errorMessage}`);
      setModelStatus('');
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !selectedFile) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(processedBlob);
    link.download = `${selectedFile.name.split('.')[0]}_no_bg.png`;
    link.click();
    addLog('Image downloaded');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Status */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {systemStatus.webgpuSupported ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                WebGPU: {systemStatus.webgpuSupported ? 'Supported' : 'Not Available'}
              </div>
              <div className="flex items-center gap-2">
                {systemStatus.webglSupported ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                WebGL: {systemStatus.webglSupported ? 'Supported' : 'Not Available'}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={systemStatus.isCompatible ? 'default' : 'destructive'}>
                  {systemStatus.isCompatible ? 'Compatible' : 'Limited'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Memory: {Math.round(systemStatus.memoryEstimate / 1024 / 1024)}MB
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Processing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            Enhanced Background Removal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Image Type</Label>
              <Select value={imageType} onValueChange={(value) => setImageType(value as any)}>
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
              <Label>Quality</Label>
              <Select value={quality} onValueChange={(value) => setQuality(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="preserve-details"
                checked={preserveDetails}
                onCheckedChange={setPreserveDetails}
              />
              <Label htmlFor="preserve-details" className="text-sm">
                Preserve Details
              </Label>
            </div>
          </div>

          {/* File Upload */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('enhanced-bg-upload')?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Select Image
            </Button>
            <input
              id="enhanced-bg-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile && (
              <span className="text-sm text-muted-foreground truncate">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
              </span>
            )}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{modelStatus || 'Processing...'}</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </div>
            </div>
          )}

          {/* Processing Log */}
          {processingLog.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {processingLog.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={handleRemoveBackground}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scissors className="w-4 h-4" />
                )}
                Remove Background
              </Button>
              {processedBlob && (
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </div>
          )}

          {/* Image Previews */}
          {(originalPreview || processedPreview) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {originalPreview && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Original</h4>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={originalPreview}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              {processedPreview && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Background Removed</h4>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-muted via-background to-muted">
                    <img
                      src={processedPreview}
                      alt="Processed"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};