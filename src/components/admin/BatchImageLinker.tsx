import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, CheckCircle, AlertCircle, RefreshCw, Database, Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BatchLinkingResult {
  sessionId: string;
  status: 'complete' | 'error' | 'running';
  progress: number;
  currentBatch: number;
  totalBatches: number;
  linksCreated: number;
  candidatesCreated: number;
  errors: string[];
  timeElapsed: number;
}

export const BatchImageLinker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BatchLinkingResult | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const checkProgress = async (sessionId: string): Promise<BatchLinkingResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('repair-missing-image-links', {
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

  const startBatchLinking = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const sessionId = `batch_${Date.now()}`;
      console.log("🚀 Starting batch image linking with progress tracking...");
      
      // Start the process
      const { data, error } = await supabase.functions.invoke('repair-missing-image-links', {
        body: { 
          mode: 'batch_progressive',
          session_id: sessionId,
          batch_size: 100,
          confidence_threshold: 70
        }
      });

      if (error) {
        throw new Error(`Batch linking failed: ${error.message}`);
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
              title: progress.status === 'complete' ? "Batch Linking Complete" : "Batch Linking Failed",
              description: progress.status === 'complete' 
                ? `Created ${progress.linksCreated} links and ${progress.candidatesCreated} candidates`
                : "Check the logs for error details",
              variant: progress.status === 'error' ? "destructive" : "default"
            });
          }
        }
      }, 2000); // Check every 2 seconds
      
      setProgressInterval(interval);
      
    } catch (error) {
      console.error('❌ Batch linking error:', error);
      setIsRunning(false);
      toast({
        title: "Batch Linking Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const stopBatchLinking = () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Progressive Batch Image Linker
          {result && (
            <Badge variant={result.status === 'complete' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
              {result.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Link images to products in progressive batches with real-time progress tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            This enhanced tool processes images in small batches to avoid timeouts and provides real-time progress updates.
          </AlertDescription>
        </Alert>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={startBatchLinking} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {isRunning ? "Processing..." : "Start Batch Linking"}
          </Button>
          
          {isRunning && (
            <Button 
              onClick={stopBatchLinking}
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

        {/* Progress Section */}
        {result && result.status === 'running' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing batch {result.currentBatch} of {result.totalBatches}...</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(result.timeElapsed / 1000)}s elapsed
              </span>
            </div>
            <Progress value={result.progress} className="w-full" />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                <div className="text-lg font-bold text-green-600">{result.linksCreated}</div>
                <div className="text-xs text-muted-foreground">Links Created</div>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                <div className="text-lg font-bold text-blue-600">{result.candidatesCreated}</div>
                <div className="text-xs text-muted-foreground">Candidates Created</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && result.status !== 'running' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{result.linksCreated}</div>
                <div className="text-xs text-muted-foreground">Links Created</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{result.candidatesCreated}</div>
                <div className="text-xs text-muted-foreground">Candidates Created</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-lg font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Success Message */}
            {result.status === 'complete' && (result.linksCreated > 0 || result.candidatesCreated > 0) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  Batch linking complete! Created {result.linksCreated} direct links and {result.candidatesCreated} candidates for review.
                  Process completed in {Math.round(result.timeElapsed / 1000)} seconds.
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
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Enhanced Features
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Progressive batch processing (100 files per batch)</li>
            <li>• Real-time progress tracking and updates</li>
            <li>• Timeout prevention with smart delays</li>
            <li>• Automatic error recovery and logging</li>
            <li>• Memory-efficient storage scanning</li>
            <li>• Consistent confidence threshold (70%) with auto-promotion</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};