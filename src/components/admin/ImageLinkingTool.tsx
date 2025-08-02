import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Image, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

  const startImageLinking = async () => {
    setIsRunning(true);
    setProgress(null);
    setLastResults(null);

    try {
      toast.info("Starting image linking process...");
      
      const { data, error } = await supabase.functions.invoke('migrate-drive-images', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setLastResults(data);
      
      if (data.success) {
        toast.success(`Image linking completed! ${data.results.successful} products linked successfully.`);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Linking Tool
          </CardTitle>
          <CardDescription>
            Link products to images from the MULTI_MATCH_ORGANIZED storage folder based on SKU matching.
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
          <CardTitle className="text-sm">About This Tool</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This tool automatically links products to images stored in the MULTI_MATCH_ORGANIZED folder by matching SKU numbers in filenames.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Scans all images in the MULTI_MATCH_ORGANIZED storage folder</li>
            <li>Extracts SKU numbers from image filenames</li>
            <li>Matches SKUs to products in the database</li>
            <li>Creates product_images records for successful matches</li>
            <li>Skips products that already have images</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};