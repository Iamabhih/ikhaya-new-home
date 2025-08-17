import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isBackgroundRemovalSupported } from "@/utils/backgroundRemoval";
import { useToast } from "@/hooks/use-toast";

interface SystemInfo {
  webgpuSupported: boolean;
  webglSupported: boolean;
  memoryEstimate: string;
  userAgent: string;
  isSupported: boolean;
}

export const BackgroundRemovalDiagnostics = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkSystemCapabilities = async () => {
    setIsChecking(true);
    try {
      // Check WebGPU
      let webgpuSupported = false;
      try {
        if ('gpu' in navigator) {
          const adapter = await (navigator as any).gpu?.requestAdapter();
          webgpuSupported = !!adapter;
        }
      } catch (e) {
        console.warn('WebGPU check failed:', e);
      }

      // Check WebGL
      let webglSupported = false;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        webglSupported = !!gl;
      } catch (e) {
        console.warn('WebGL check failed:', e);
      }

      // Memory estimate
      const memoryEstimate = (navigator as any).deviceMemory 
        ? `${(navigator as any).deviceMemory} GB` 
        : 'Unknown';

      // Overall support check
      const isSupported = await isBackgroundRemovalSupported();

      const info: SystemInfo = {
        webgpuSupported,
        webglSupported,
        memoryEstimate,
        userAgent: navigator.userAgent,
        isSupported,
      };

      setSystemInfo(info);
      
      toast({
        title: "System Check Complete",
        description: isSupported 
          ? "Background removal is supported on this device" 
          : "Background removal may have limited functionality",
      });
    } catch (error) {
      console.error('System check failed:', error);
      toast({
        title: "System Check Failed",
        description: "Could not determine system capabilities",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkSystemCapabilities();
  }, []);

  if (!systemInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span>Checking system capabilities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Diagnostics</CardTitle>
        <Button 
          onClick={checkSystemCapabilities} 
          disabled={isChecking}
          variant="outline"
          size="sm"
        >
          {isChecking ? "Checking..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Overall Status: {" "}
            <Badge variant={systemInfo.isSupported ? "default" : "destructive"}>
              {systemInfo.isSupported ? "Supported" : "Limited Support"}
            </Badge>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">WebGPU Support</div>
            <Badge variant={systemInfo.webgpuSupported ? "default" : "secondary"}>
              {systemInfo.webgpuSupported ? "Available" : "Not Available"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">WebGL Support</div>
            <Badge variant={systemInfo.webglSupported ? "default" : "secondary"}>
              {systemInfo.webglSupported ? "Available" : "Not Available"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Device Memory</div>
            <span className="text-sm">{systemInfo.memoryEstimate}</span>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Browser</div>
            <span className="text-xs text-muted-foreground">
              {systemInfo.userAgent.split(' ').slice(-2).join(' ')}
            </span>
          </div>
        </div>

        {!systemInfo.isSupported && (
          <Alert>
            <AlertDescription>
              <strong>Recommendations:</strong>
              <ul className="mt-2 text-sm space-y-1">
                <li>• Use Chrome, Firefox, or Edge for best compatibility</li>
                <li>• Ensure hardware acceleration is enabled</li>
                <li>• Try reducing image sizes if processing fails</li>
                <li>• Close other tabs to free up memory</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};