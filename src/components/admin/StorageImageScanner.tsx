import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, CheckCircle, AlertCircle, Activity, Pause, Play, Square, RefreshCw,
  Database, FolderOpen, Image as ImageIcon, Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScanProgress {
  sessionId: string;
  status: 'initializing' | 'scanning' | 'processing' | 'completed' | 'error';
  currentStep: string;
  processed: number;
  successful: number;
  failed: number;
  total: number;
  currentFile?: string;
  errors: string[];
  startTime: string;
  foundImages: number;
  matchedProducts: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  type?: 'match' | 'progress' | 'error' | 'info';
}

export const StorageImageScanner = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'matches' | 'progress' | 'errors'>('all');
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (level: 'info' | 'warn' | 'error', message: string, type?: 'match' | 'progress' | 'error' | 'info') => {
    // Detect log type from message content if not specified
    let logType = type;
    if (!logType) {
      if (message.includes('✅ Matched SKU')) {
        logType = 'match';
      } else if (message.includes('❌')) {
        logType = 'error';
      } else if (message.includes('Found') || message.includes('Building') || message.includes('cache')) {
        logType = 'progress';
      } else {
        logType = 'info';
      }
    }

    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      type: logType
    };
    setLogs(prev => [...prev, logEntry]);
  };

  const setupRealtimeChannel = (sessionId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`storage-scan-${sessionId}`)
      .on(
        'broadcast',
        { event: 'scan_progress' },
        (payload) => {
          const data = payload.payload as ScanProgress;
          setProgress(data);
        }
      )
      .on(
        'broadcast', 
        { event: 'scan_log' },
        (payload) => {
          const logData = payload.payload;
          if (logData && logData.message) {
            addLog(logData.level || 'info', logData.message);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleScan = async () => {
    setIsProcessing(true);
    setProgress(null);
    setLogs([]);
    
    addLog('info', '🔍 Starting storage bucket image scan...');

    try {
      const { data, error } = await supabase.functions.invoke('scan-storage-images');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setSessionId(data.sessionId);
        setupRealtimeChannel(data.sessionId);
        
        toast({
          title: "Storage Scan Started",
          description: "Real-time progress will be shown below",
        });
      } else {
        throw new Error(data?.error || "Storage scan failed to start");
      }
    } catch (error) {
      console.error('Storage scan error:', error);
      addLog('error', `❌ Failed to start storage scan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Storage Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsProcessing(false);
    addLog('warn', '⏹️ Storage scan stopped by user');
    toast({
      title: "Scan Stopped",
      description: "The storage scan process has been stopped",
      variant: "destructive",
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setProgress(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'initializing': return 'bg-blue-500';
      case 'scanning': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'matches') return log.type === 'match';
    if (logFilter === 'progress') return log.type === 'progress';
    if (logFilter === 'errors') return log.level === 'error' || log.type === 'error';
    return true;
  });

  const getLogIcon = (log: LogEntry) => {
    if (log.type === 'match') return '✅';
    if (log.type === 'error' || log.level === 'error') return '❌';
    if (log.type === 'progress') return '📊';
    return '🔍';
  };

  const getLogColor = (log: LogEntry) => {
    if (log.type === 'match') return 'text-green-600';
    if (log.type === 'error' || log.level === 'error') return 'text-red-600';
    if (log.type === 'progress') return 'text-blue-600';
    return 'text-foreground';
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-stop when completed or error
    if (progress && (progress.status === 'completed' || progress.status === 'error')) {
      setIsProcessing(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
  }, [progress]);

  return (
    <div className="space-y-6">
      {/* Main Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Storage Bucket Image Scanner
            {progress && (
              <Badge variant="outline" className={`${getStatusColor(progress.status)} text-primary-foreground`}>
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Scan the 'product-images' storage bucket (including subdirectories) and automatically match images to products based on SKU variants in filenames.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              This enhanced scanner recursively searches all storage folders with advanced multi-SKU support, handling complex filename patterns like "319027.319026.PNG". 
              Features fuzzy matching, bidirectional mapping, and comprehensive reporting with category-based organization.
            </AlertDescription>
          </Alert>

          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleScan} 
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isProcessing ? "Scanning Storage..." : "Start Storage Scan"}
            </Button>
            
            {isProcessing && (
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Scan
              </Button>
            )}

            <Button 
              onClick={clearLogs}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear Logs
            </Button>
          </div>

          {/* Progress Section */}
          {progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress: {progress.processed} / {progress.total}</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="w-full" />
              </div>

              {/* Enhanced Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{progress.foundImages}</div>
                  <div className="text-xs text-muted-foreground">Images Found</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">{progress.matchedProducts}</div>
                  <div className="text-xs text-muted-foreground">Products Matched</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">{progress.processed}</div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{progress.successful}</div>
                  <div className="text-xs text-muted-foreground">Successful</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{progress.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">
                    {logs.filter(log => log.message.includes('Multi-SKU')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Multi-SKU Files</div>
                </div>
              </div>

              {/* Current File */}
              {progress.currentFile && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Currently processing:</strong> {progress.currentFile}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Scan Logs
              <Badge variant="outline">{filteredLogs.length} of {logs.length} entries</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={logFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('all')}
              >
                All
              </Button>
              <Button
                variant={logFilter === 'matches' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('matches')}
                className="text-green-600"
              >
                Matches
              </Button>
              <Button
                variant={logFilter === 'progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('progress')}
                className="text-blue-600"
              >
                Progress
              </Button>
              <Button
                variant={logFilter === 'errors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('errors')}
                className="text-red-600"
              >
                Errors
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 w-full border rounded-md p-4">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {logs.length === 0 
                    ? "No logs yet. Start a storage scan to see real-time progress."
                    : `No ${logFilter} logs found. Try a different filter.`
                  }
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-lg">{getLogIcon(log)}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </span>
                    <Badge 
                      variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'outline' : 'secondary'}
                      className="text-xs px-1"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className={`${getLogColor(log)} flex-1 font-mono text-xs leading-relaxed`}>
                      {log.message}
                    </span>
                    {log.type && (
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Feature Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Enhanced SKU Matching Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Enhanced Filename Patterns
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Direct SKU matches: <code>ABC123.jpg</code></li>
                <li>Multi-SKU files: <code>319027.319026.PNG</code></li>
                <li>With delimiters: <code>SKU-ABC123.png</code></li>
                <li>In subdirectories: <code>products/ABC123/image.jpg</code></li>
                <li>With prefixes: <code>ITEM_ABC123.jpg</code></li>
                <li>Bracket patterns: <code>[ABC123]_photo.jpg</code></li>
                <li>Path-based SKUs: <code>category/123/product.jpg</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Advanced SKU Matching
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Zero-padded numbers: <code>123</code> ↔ <code>0123</code></li>
                <li>Leading zeros: <code>0123</code> ↔ <code>123</code></li>
                <li>Multiple SKUs per file: <code>123.456.789</code></li>
                <li>Fuzzy matching: <code>ABC123</code> ≈ <code>ABC124</code></li>
                <li>Bidirectional mapping: One image → Multiple SKUs</li>
                <li>Alternative images: One SKU → Multiple images</li>
                <li>Comprehensive similarity scoring (80%+ threshold)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};