import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, CheckCircle, AlertCircle, RefreshCw, Database, Link as LinkIcon,
  ArrowRight, Clock, TrendingUp, FileSearch, Users, Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConsolidatedResult {
  sessionId: string;
  status: 'running' | 'complete' | 'error';
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number;
  
  candidatesPromoted: number;
  productsScanned: number;
  imagesScanned: number;
  directLinksCreated: number;
  candidatesCreated: number;
  
  totalProductsWithoutImages: number;
  totalStorageImages: number;
  
  errors: string[];
  stepErrors: { [step: string]: string[] };
  
  startedAt: string;
  completedAt?: string;
  stepTimings: { [step: string]: number };
  timeElapsed: number;
}

const PROCESSING_STEPS = [
  { name: 'Initialize Session', icon: Database, description: 'Setting up processing session' },
  { name: 'Auto-Promote Existing Candidates', icon: TrendingUp, description: 'Promoting high-confidence candidates' },
  { name: 'Scan All Products', icon: Users, description: 'Finding products needing images' },
  { name: 'Scan All Storage Images', icon: ImageIcon, description: 'Analyzing all storage files' },
  { name: 'Advanced SKU Matching', icon: FileSearch, description: 'Matching images to products' },
  { name: 'Create Links & Candidates', icon: LinkIcon, description: 'Creating final links' },
  { name: 'Generate Summary Report', icon: CheckCircle, description: 'Finalizing results' }
];

export const ConsolidatedImageLinker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ConsolidatedResult | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const checkProgress = async (sessionId: string): Promise<ConsolidatedResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('consolidated-image-linker', {
        body: { 
          mode: 'check_progress',
          session_id: sessionId
        }
      });

      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  };

  const startConsolidatedProcessing = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const sessionId = `consolidated_${Date.now()}`;
      console.log("🚀 Starting consolidated image linking process...");
      console.log("🔍 Debugging packaging products - looking for SKUs: 455404, 455382");
      
      const { data, error } = await supabase.functions.invoke('consolidated-image-linker', {
        body: { 
          mode: 'consolidated_process',
          session_id: sessionId,
          confidence_threshold: 70,
          debug_skus: ['455404', '455382'] // Add specific SKUs to debug
        }
      });

      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      // Set up progress tracking
      const interval = setInterval(async () => {
        const progress = await checkProgress(sessionId);
        if (progress) {
          setResult(progress);
          
          if (progress.status === 'complete' || progress.status === 'error') {
            clearInterval(interval);
            setIsRunning(false);
            
            toast({
              title: progress.status === 'complete' ? "Processing Complete!" : "Processing Failed",
              description: progress.status === 'complete' 
                ? `Successfully processed ${progress.imagesScanned} images and created ${progress.directLinksCreated} links`
                : "Check the logs for error details",
              variant: progress.status === 'error' ? "destructive" : "default"
            });
          }
        }
      }, 3000); // Check every 3 seconds
      
      setProgressInterval(interval);
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      setIsRunning(false);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const stopProcessing = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    setIsRunning(false);
  };

  const clearResults = () => {
    setResult(null);
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
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
          <Zap className="h-5 w-5" />
          Consolidated Image Linking System
          {result && (
            <Badge variant={
              result.status === 'complete' ? 'default' : 
              result.status === 'error' ? 'destructive' : 'secondary'
            }>
              {result.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Comprehensive 7-step process to scan all storage images, match them to products, and create links automatically.
          Processes ALL images and products without limitations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete Solution:</strong> This unified tool replaces all fragmented image linking tools. 
            It processes ALL 1,363+ storage images against ALL products in a single comprehensive workflow.
          </AlertDescription>
        </Alert>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={startConsolidatedProcessing} 
            disabled={isRunning}
            size="lg"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isRunning ? "Processing..." : "Start Consolidated Processing"}
          </Button>
          
          {isRunning && (
            <Button 
              onClick={stopProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Stop Process
            </Button>
          )}
          
          <Button 
            onClick={clearResults}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Results
          </Button>
        </div>

        {/* Processing Steps Overview */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            7-Step Consolidated Process
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PROCESSING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCurrentStep = result?.currentStep === index;
              const isCompleted = result && result.currentStep > index;
              
              return (
                <div key={index} className={`flex items-center gap-2 p-2 rounded text-sm ${
                  isCurrentStep ? 'bg-primary/10 border border-primary/20' :
                  isCompleted ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                  'text-muted-foreground'
                }`}>
                  <StepIcon className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">{index + 1}. {step.name}</div>
                    <div className="text-xs opacity-75">{step.description}</div>
                  </div>
                  {isCurrentStep && (
                    <RefreshCw className="h-3 w-3 animate-spin ml-auto" />
                  )}
                  {isCompleted && (
                    <CheckCircle className="h-3 w-3 ml-auto text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Section */}
        {result && result.status === 'running' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  Step {result.currentStep + 1}/{result.totalSteps}: {result.stepName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(result.timeElapsed)} elapsed
              </div>
            </div>
            
            <Progress value={result.progress} className="w-full" />
            
            {/* Live Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{result.productsScanned}</div>
                <div className="text-xs text-muted-foreground">Products Scanned</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{result.imagesScanned}</div>
                <div className="text-xs text-muted-foreground">Images Scanned</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{result.directLinksCreated}</div>
                <div className="text-xs text-muted-foreground">Links Created</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{result.candidatesCreated}</div>
                <div className="text-xs text-muted-foreground">Candidates Created</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && result.status !== 'running' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{result.candidatesPromoted}</div>
                <div className="text-xs text-muted-foreground">Promoted</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{result.productsScanned}</div>
                <div className="text-xs text-muted-foreground">Products</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-lg font-bold text-purple-600">{result.imagesScanned}</div>
                <div className="text-xs text-muted-foreground">Images</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{result.directLinksCreated}</div>
                <div className="text-xs text-muted-foreground">Direct Links</div>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="text-lg font-bold text-amber-600">{result.candidatesCreated}</div>
                <div className="text-xs text-muted-foreground">Candidates</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-lg font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Products needing images:</span>
                  <span className="ml-2 text-red-600 font-bold">{result.totalProductsWithoutImages}</span>
                </div>
                <div>
                  <span className="font-medium">Total storage images:</span>
                  <span className="ml-2 text-blue-600 font-bold">{result.totalStorageImages}</span>
                </div>
                <div>
                  <span className="font-medium">Processing time:</span>
                  <span className="ml-2 text-green-600 font-bold">
                    {result.completedAt ? formatTime(result.timeElapsed) : 'In progress...'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Success rate:</span>
                  <span className="ml-2 text-green-600 font-bold">
                    {result.totalProductsWithoutImages > 0 
                      ? Math.round(((result.directLinksCreated + result.candidatesCreated) / result.totalProductsWithoutImages) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {result.status === 'complete' && (result.directLinksCreated > 0 || result.candidatesCreated > 0) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  <strong>Consolidated processing complete!</strong> Successfully processed {result.imagesScanned} storage images 
                  and {result.productsScanned} products. Created {result.directLinksCreated} direct links and {result.candidatesCreated} candidates.
                  {result.candidatesPromoted > 0 && ` Also promoted ${result.candidatesPromoted} existing candidates.`}
                </AlertDescription>
              </Alert>
            )}

            {/* No Results */}
            {result.status === 'complete' && result.directLinksCreated === 0 && result.candidatesCreated === 0 && result.candidatesPromoted === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No new links were created. All products with matching storage images may already have their links established.
                  Scanned {result.imagesScanned} images and {result.productsScanned} products.
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

        {/* Features Description */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Consolidated System Features
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Complete Coverage:</strong> Processes ALL storage images (no 1000-limit restrictions)</li>
            <li>• <strong>Comprehensive SKU Matching:</strong> Advanced pattern recognition with confidence scoring</li>
            <li>• <strong>Step-by-Step Processing:</strong> Clear progress tracking through 7 defined stages</li>
            <li>• <strong>Automatic Promotion:</strong> Promotes high-confidence candidates (≥70%) before scanning</li>
            <li>• <strong>Intelligent Linking:</strong> Direct links for high confidence (≥85%), candidates for review (70-84%)</li>
            <li>• <strong>Error Recovery:</strong> Robust error handling and step-by-step logging</li>
            <li>• <strong>Performance Optimized:</strong> Large batch sizes (500 files) for maximum efficiency</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};