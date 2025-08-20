import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, Loader2, Trash2, Database, CheckCircle, AlertTriangle 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConsolidatedResult {
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentStep: string
  productsScanned: number
  imagesScanned: number
  directLinksCreated: number
  candidatesCreated: number
  errors: string[]
  startTime: string
  endTime?: string
  totalTime?: number
  debugInfo?: any
}

export const ConsolidatedImageLinker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ConsolidatedResult | null>(null);
  const { toast } = useToast();

  const startConsolidatedProcessing = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🚀 Starting consolidated processing...');
      
      const { data, error } = await supabase.functions.invoke('consolidated-image-linker', {
        body: { mode: 'consolidated_process' }
      });

      if (error) {
        console.error('❌ Error during processing:', error);
        toast({
          title: "Processing Failed",
          description: `Processing failed: ${error.message}`,
          variant: "destructive"
        });
        setIsRunning(false);
        return;
      }

      console.log('✅ Processing completed:', data);
      setResult(data);
      setIsRunning(false);
      
      if (data.status === 'completed') {
        toast({
          title: "Processing Complete!",
          description: `${data.directLinksCreated} direct links, ${data.candidatesCreated} candidates created.`
        });
      } else {
        toast({
          title: "Processing Failed",
          description: `Processing failed with ${data.errors?.length || 0} errors.`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to process:', error);
      toast({
        title: "Processing Failed",
        description: 'Failed to process images',
        variant: "destructive"
      });
      setIsRunning(false);
    }
  };

  // Remove progress checking - we now get results directly

  const clearResults = () => {
    setResult(null);
    setIsRunning(false);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
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
          Streamlined Image Linking System
        </CardTitle>
        <CardDescription>
          Direct processing of all storage images to match and link them to products automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete Solution:</strong> This streamlined system processes ALL storage images 
            against ALL products in a single operation without session complexity.
          </AlertDescription>
        </Alert>

        {/* Control Buttons */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={startConsolidatedProcessing}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Processing
                </>
              )}
            </Button>
            
            {result && (
              <Button 
                onClick={clearResults}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Results
              </Button>
            )}
          </div>
          
          {/* Processing Steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="font-medium">1. Load Products</div>
              <div className="text-xs text-muted-foreground">Get active products</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg text-center">
              <div className="font-medium">2. Scan Storage</div>
              <div className="text-xs text-muted-foreground">Find all images</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="font-medium">3. Match SKUs</div>
              <div className="text-xs text-muted-foreground">Link products</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <div className="font-medium">4. Create Links</div>
              <div className="text-xs text-muted-foreground">Save results</div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {result.productsScanned || 0}
                </div>
                <div className="text-sm text-blue-600">Products Scanned</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.imagesScanned || 0}
                </div>
                <div className="text-sm text-green-600">Images Scanned</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(result.directLinksCreated || 0) + (result.candidatesCreated || 0)}
                </div>
                <div className="text-sm text-purple-600">Total Matches</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="text-xl font-bold text-emerald-600">
                  {result.directLinksCreated || 0}
                </div>
                <div className="text-sm text-emerald-600">Direct Links Created</div>
                <div className="text-xs text-emerald-500 mt-1">High confidence matches (≥80%)</div>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-xl font-bold text-amber-600">
                  {result.candidatesCreated || 0}
                </div>
                <div className="text-sm text-amber-600">Candidates Created</div>
                <div className="text-xs text-amber-500 mt-1">Lower confidence matches for review</div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                result.status === 'completed' ? 'bg-green-100 text-green-800' :
                result.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {result.status}
              </span>
              {result.totalTime && (
                <span className="text-xs text-gray-500 ml-2">
                  Completed in {formatTime(result.totalTime)}
                </span>
              )}
            </div>
            
            {/* Debug Info for Packaging */}
            {result.debugInfo?.packagingMatches && result.debugInfo.packagingMatches.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  📦 Packaging Matches Found ({result.debugInfo.packagingMatches.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.debugInfo.packagingMatches.map((match, index) => (
                    <p key={index} className="text-xs text-blue-700">
                      {match.filename} → {match.productSku} ({match.confidence}%)
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Errors ({result.errors.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-700">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {result?.status === 'completed' && (result.directLinksCreated > 0 || result.candidatesCreated > 0) && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-600">
              <strong>Processing complete!</strong> Successfully processed {result.imagesScanned} images 
              and created {result.directLinksCreated} direct links and {result.candidatesCreated} candidates.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};