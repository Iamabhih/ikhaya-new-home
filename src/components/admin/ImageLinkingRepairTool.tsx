import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wrench, CheckCircle, AlertCircle, RefreshCw, Database, Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RepairResult {
  sessionId: string;
  status: 'complete' | 'error';
  productsChecked: number;
  imagesFound: number;
  linksCreated: number;
  errors: string[];
}

export const ImageLinkingRepairTool = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);
  const { toast } = useToast();

  const handleRepair = async () => {
    setIsRepairing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('repair-missing-image-links');

      if (error) {
        throw new Error(`Repair failed: ${error.message}`);
      }

      setResult(data);
      
      toast({
        title: "Image Repair Complete",
        description: `Created ${data.linksCreated} new image links from ${data.imagesFound} storage images`,
      });
    } catch (error) {
      console.error('Repair error:', error);
      toast({
        title: "Repair Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const clearResults = () => {
    setResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Image Linking Repair Tool
          {result && (
            <Badge variant={result.status === 'complete' ? 'default' : 'destructive'}>
              {result.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Find products without images and automatically link them to matching storage images based on SKU patterns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            This tool specifically targets the 455470 issue and similar cases where products exist with matching storage images but no database links. 
            It uses advanced SKU matching including zero-padding, multi-SKU files, and pattern variations.
          </AlertDescription>
        </Alert>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRepair} 
            disabled={isRepairing}
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            {isRepairing ? "Repairing Links..." : "Start Image Repair"}
          </Button>
          
          <Button 
            onClick={clearResults}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Results
          </Button>
        </div>

        {/* Progress Section */}
        {isRepairing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Scanning products and storage images...</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{result.productsChecked}</div>
                <div className="text-xs text-muted-foreground">Products Checked</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{result.imagesFound}</div>
                <div className="text-xs text-muted-foreground">Images Found</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{result.linksCreated}</div>
                <div className="text-xs text-muted-foreground">Links Created</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-lg font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Success Message */}
            {result.status === 'complete' && result.linksCreated > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  Successfully repaired {result.linksCreated} missing image links! 
                  Products like SKU 455470 should now display their images correctly.
                </AlertDescription>
              </Alert>
            )}

            {/* No Links Created */}
            {result.status === 'complete' && result.linksCreated === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No missing links were found to repair. All products with available storage images already have their links established.
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({result.errors.length})
                </h4>
                <ScrollArea className="h-32 w-full border rounded p-2">
                  <div className="space-y-1">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600">
                        {error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Features Description */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Advanced Matching Features
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Direct SKU filename matching (455470.jpg → SKU 455470)</li>
            <li>• Zero-padding variations (455470 ↔ 0455470)</li>
            <li>• Multi-SKU file support (455470.455471.455472.png)</li>
            <li>• Pattern matching (IMG_455470_001.jpg)</li>
            <li>• Folder-based SKU detection</li>
            <li>• Confidence scoring for match quality</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};