import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, RefreshCw, Activity, CheckCircle, AlertCircle, 
  Image as ImageIcon, Loader2, Zap, Link as LinkIcon, TrendingUp,
  FileSearch, BarChart3, Settings, Play, Square, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MasterResult {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  currentStep: string;
  currentBatch: number;
  totalBatches: number;
  
  // Comprehensive statistics
  productsScanned: number;
  imagesScanned: number;
  directLinksCreated: number;
  candidatesCreated: number;
  imagesCleared?: number;
  
  // Performance metrics
  startTime: string;
  endTime?: string;
  totalTime?: number;
  avgProcessingTime?: number;
  
  // SKU matching breakdown
  matchingStats: {
    exactMatch: number;
    multiSku: number;
    paddedSku: number;
    patternMatch: number;
    fuzzyMatch: number;
  };
  
  // Detailed logging
  errors: string[];
  warnings: string[];
  debugInfo?: any;
  
  // Real-time metrics
  processingRate?: number; // items per second
  timeRemaining?: number; // estimated seconds
}

interface ProcessingOptions {
  mode: 'standard' | 'refresh' | 'audit' | 'resume';
  batchSize: number;
  confidenceThreshold: number;
  enableFuzzyMatching: boolean;
  strictSkuMatching: boolean;
  processMultiSku: boolean;
  resumeFromBatch?: number;
}

export const MasterImageLinker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MasterResult | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const [options, setOptions] = useState<ProcessingOptions>({
    mode: 'standard',
    batchSize: 10000, // No artificial limits
    confidenceThreshold: 80,
    enableFuzzyMatching: false,
    strictSkuMatching: true,
    processMultiSku: true
  });
  const { toast } = useToast();

  // Safe result validator to prevent frontend crashes
  const validateResult = (data: any): MasterResult | null => {
    if (!data || typeof data !== 'object') {
      console.warn('Invalid result data received:', data);
      return null;
    }

    // Ensure matchingStats exists with all required properties
    if (!data.matchingStats || typeof data.matchingStats !== 'object') {
      console.warn('Missing matchingStats, initializing');
      data.matchingStats = {
        exactMatch: 0,
        multiSku: 0,
        paddedSku: 0,
        patternMatch: 0,
        fuzzyMatch: 0,
      };
    } else {
      // Validate each stat property
      const requiredStats = ['exactMatch', 'multiSku', 'paddedSku', 'patternMatch', 'fuzzyMatch'];
      requiredStats.forEach(stat => {
        if (typeof data.matchingStats[stat] !== 'number') {
          console.warn(`Invalid ${stat} value, setting to 0`);
          data.matchingStats[stat] = 0;
        }
      });
    }

    // Ensure other required properties exist
    if (!Array.isArray(data.errors)) data.errors = [];
    if (!Array.isArray(data.warnings)) data.warnings = [];
    if (typeof data.progress !== 'number') data.progress = 0;
    if (typeof data.currentStep !== 'string') data.currentStep = 'Processing...';

    return data as MasterResult;
  };

  const checkProgress = async (sessionId: string): Promise<MasterResult | null> => {
    try {
      console.log(`Checking progress for session: ${sessionId}`);
      
      const { data, error } = await supabase.functions.invoke('master-image-linker', {
        body: { 
          action: 'check_progress',
          sessionId
        }
      });

      if (error) {
        console.error('Progress check error:', error);
        return null;
      }

      if (!data) {
        console.warn('No data received from progress check');
        return null;
      }

      if (data.error) {
        console.error('Server returned error:', data.error);
        return null;
      }

      // Validate and sanitize the result before using it
      const validatedResult = validateResult(data);
      if (!validatedResult) {
        console.error('Failed to validate result data');
        return null;
      }

      return validatedResult;
    } catch (error) {
      console.error('Exception during progress check:', error);
      return null;
    }
  };

  const startProcessing = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const sessionId = `master_${Date.now()}`;
      console.log("🚀 Starting Master Image Linker...");
      
      toast({
        title: "Master Image Linker Started",
        description: `Processing with ${options.mode} mode - No scale limitations applied`,
      });

      const { data, error } = await supabase.functions.invoke('master-image-linker', {
        body: { 
          action: 'start',
          sessionId,
          options
        }
      });

      if (error) {
        throw new Error(`Processing failed: ${error.message}`);
      }

      // Set up real-time progress tracking with enhanced error handling
      const interval = setInterval(async () => {
        const progress = await checkProgress(sessionId);
        if (progress) {
          setResult(progress);
          
          if (progress.status === 'completed' || progress.status === 'failed') {
            clearInterval(interval);
            setIsRunning(false);
            
            toast({
              title: progress.status === 'completed' ? "Processing Complete" : "Processing Failed",
              description: progress.status === 'completed' 
                ? `Created ${progress.directLinksCreated} direct links and ${progress.candidatesCreated} candidates`
                : "Check the logs for error details",
              variant: progress.status === 'failed' ? "destructive" : "default"
            });
          }
        } else {
          // Handle case where progress check fails
          console.warn('Failed to get progress update, will retry...');
        }
      }, 1000); // Real-time updates every second
      
      setProgressInterval(interval);
      
    } catch (error) {
      console.error('❌ Master processing error:', error);
      setIsRunning(false);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const pauseProcessing = async () => {
    if (result?.sessionId) {
      await supabase.functions.invoke('master-image-linker', {
        body: { action: 'pause', sessionId: result.sessionId }
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

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Database className="h-6 w-6 text-primary" />
            Master Image Linker
            {result && (
              <Badge 
                variant={
                  result.status === 'completed' ? 'default' : 
                  result.status === 'failed' ? 'destructive' : 
                  result.status === 'paused' ? 'secondary' : 'outline'
                }
                className="ml-2"
              >
                {result.status}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-lg">
            Enterprise-scale image linking system with no artificial limitations.
            Processes 50,000+ images and 10,000+ products with strict full SKU matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Enterprise Features:</strong> No scale limits, parallel processing, 
              real-time progress tracking, full SKU matching only, multi-SKU support, 
              comprehensive error handling, and resume capability.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Main Processing Interface */}
      <Tabs defaultValue="process" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Process
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Processing Tab */}
        <TabsContent value="process" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Processing Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Control Buttons */}
              <div className="flex items-center gap-4 flex-wrap">
                <Button 
                  onClick={startProcessing} 
                  disabled={isRunning}
                  size="lg"
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
                
                {isRunning && (
                  <>
                    <Button 
                      onClick={pauseProcessing}
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Pause
                    </Button>
                    <Button 
                      onClick={stopProcessing}
                      variant="destructive"
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}
                
                <Button 
                  onClick={clearResults}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Results
                </Button>
              </div>

              {/* Processing Mode Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant={options.mode === 'standard' ? 'default' : 'outline'}
                  onClick={() => setOptions(prev => ({ ...prev, mode: 'standard' }))}
                  disabled={isRunning}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <LinkIcon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Standard</div>
                    <div className="text-xs text-muted-foreground">Link images to products</div>
                  </div>
                </Button>
                
                <Button
                  variant={options.mode === 'refresh' ? 'default' : 'outline'}
                  onClick={() => setOptions(prev => ({ ...prev, mode: 'refresh' }))}
                  disabled={isRunning}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <RefreshCw className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Complete Refresh</div>
                    <div className="text-xs text-muted-foreground">Clear all + rescan</div>
                  </div>
                </Button>
                
                <Button
                  variant={options.mode === 'audit' ? 'default' : 'outline'}
                  onClick={() => setOptions(prev => ({ ...prev, mode: 'audit' }))}
                  disabled={isRunning}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <FileSearch className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Audit Only</div>
                    <div className="text-xs text-muted-foreground">Analyze without changes</div>
                  </div>
                </Button>
                
                <Button
                  variant={options.mode === 'resume' ? 'default' : 'outline'}
                  onClick={() => setOptions(prev => ({ ...prev, mode: 'resume' }))}
                  disabled={isRunning}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Activity className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Resume</div>
                    <div className="text-xs text-muted-foreground">Continue from pause</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Configuration</CardTitle>
              <CardDescription>
                Configure processing parameters - no artificial scale limitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Batch Size</label>
                    <input
                      type="number"
                      min="1000"
                      max="50000"
                      value={options.batchSize}
                      onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 10000 }))}
                      className="w-full mt-1 px-3 py-2 border rounded"
                      disabled={isRunning}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Process up to 50,000 items per batch</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Confidence Threshold (%)</label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={options.confidenceThreshold}
                      onChange={(e) => setOptions(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) || 80 }))}
                      className="w-full mt-1 px-3 py-2 border rounded"
                      disabled={isRunning}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum confidence for automatic linking</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="strictSku"
                      checked={options.strictSkuMatching}
                      onChange={(e) => setOptions(prev => ({ ...prev, strictSkuMatching: e.target.checked }))}
                      disabled={isRunning}
                    />
                    <label htmlFor="strictSku" className="text-sm font-medium">Strict SKU Matching</label>
                  </div>
                  <p className="text-xs text-muted-foreground">Only link images with full SKU in filename</p>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="multiSku"
                      checked={options.processMultiSku}
                      onChange={(e) => setOptions(prev => ({ ...prev, processMultiSku: e.target.checked }))}
                      disabled={isRunning}
                    />
                    <label htmlFor="multiSku" className="text-sm font-medium">Multi-SKU Support</label>
                  </div>
                  <p className="text-xs text-muted-foreground">Handle files like 12345.67890.jpg</p>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="fuzzyMatch"
                      checked={options.enableFuzzyMatching}
                      onChange={(e) => setOptions(prev => ({ ...prev, enableFuzzyMatching: e.target.checked }))}
                      disabled={isRunning}
                    />
                    <label htmlFor="fuzzyMatch" className="text-sm font-medium">Fuzzy Matching</label>
                  </div>
                  <p className="text-xs text-muted-foreground">Enable similarity-based matching (lower accuracy)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {result ? (
            <>
              {/* Real-time Progress */}
              {result.status === 'running' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 animate-pulse text-blue-600" />
                      Real-time Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{result.currentStep}</span>
                      <span className="text-sm text-muted-foreground">
                        Batch {result.currentBatch} of {result.totalBatches}
                      </span>
                    </div>
                    <Progress value={result.progress} className="w-full h-3" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                        <div className="text-lg font-bold text-blue-600">{result.processingRate?.toFixed(1) || '0'}</div>
                        <div className="text-xs text-muted-foreground">Items/sec</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                        <div className="text-lg font-bold text-green-600">{result.directLinksCreated}</div>
                        <div className="text-xs text-muted-foreground">Links Created</div>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded">
                        <div className="text-lg font-bold text-orange-600">{result.candidatesCreated}</div>
                        <div className="text-xs text-muted-foreground">Candidates</div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded">
                        <div className="text-lg font-bold text-purple-600">
                          {result.timeRemaining ? formatTime(result.timeRemaining * 1000) : 'Calculating...'}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. Remaining</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Processing Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{result.productsScanned}</div>
                      <div className="text-sm text-muted-foreground">Products Scanned</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{result.imagesScanned}</div>
                      <div className="text-sm text-muted-foreground">Images Scanned</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{result.directLinksCreated}</div>
                      <div className="text-sm text-muted-foreground">Direct Links</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{result.candidatesCreated}</div>
                      <div className="text-sm text-muted-foreground">Candidates</div>
                    </div>
                  </div>
                  
                   {/* SKU Matching Breakdown */}
                  {result.matchingStats && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold mb-3">SKU Matching Breakdown</h4>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="text-sm font-bold text-green-600">
                            {typeof result.matchingStats.exactMatch === 'number' ? result.matchingStats.exactMatch : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Exact</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="text-sm font-bold text-blue-600">
                            {typeof result.matchingStats.multiSku === 'number' ? result.matchingStats.multiSku : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Multi-SKU</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="text-sm font-bold text-purple-600">
                            {typeof result.matchingStats.paddedSku === 'number' ? result.matchingStats.paddedSku : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Padded</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="text-sm font-bold text-orange-600">
                            {typeof result.matchingStats.patternMatch === 'number' ? result.matchingStats.patternMatch : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Pattern</div>
                        </div>
                        <div className="text-center p-2 bg-background rounded border">
                          <div className="text-sm font-bold text-amber-600">
                            {typeof result.matchingStats.fuzzyMatch === 'number' ? result.matchingStats.fuzzyMatch : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Fuzzy</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Performance Metrics */}
                  {result.totalTime && (
                    <div className="mt-4 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Total Processing Time: {formatTime(result.totalTime)}</span>
                      </div>
                      {result.avgProcessingTime && (
                        <span className="text-sm text-muted-foreground">
                          Avg: {result.avgProcessingTime.toFixed(2)}ms per item
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Errors and Warnings */}
              {(result.errors.length > 0 || result.warnings.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Issues & Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-600">Errors ({result.errors.length})</h4>
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
                    
                    {result.warnings.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="font-semibold text-orange-600">Warnings ({result.warnings.length})</h4>
                        <ScrollArea className="h-24 w-full border rounded p-2">
                          <div className="space-y-1">
                            {result.warnings.slice(0, 10).map((warning, index) => (
                              <div key={index} className="text-sm text-orange-600">
                                {warning}
                              </div>
                            ))}
                            {result.warnings.length > 10 && (
                              <div className="text-sm text-orange-600 font-medium">
                                ... and {result.warnings.length - 10} more warnings
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-muted-foreground">
                  No processing results available. Start processing to see progress.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                System Audit
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of images and products without making changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Audit functionality will analyze your entire image/product database and provide
                detailed reports on unlinked images, missing products, duplicate files, and 
                optimization opportunities.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};