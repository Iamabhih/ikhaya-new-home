import { useState, useEffect, useRef, useCallback } from "react";
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
  uuidMatches?: number;
  skuMatches?: number;
  multiMatchImages?: number;
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
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const autoScrollRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (autoScrollRef.current) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const addLog = useCallback((level: 'info' | 'warn' | 'error', message: string, type?: 'match' | 'progress' | 'error' | 'info') => {
    // Detect log type from message content if not specified
    let logType = type;
    if (!logType) {
      if (message.includes('✅ Matched') || message.includes('[SKU_MATCH]') || message.includes('[UUID_MATCH]')) {
        logType = 'match';
      } else if (message.includes('❌') || message.includes('Failed')) {
        logType = 'error';
      } else if (message.includes('Processing') || message.includes('Scanning') || message.includes('Found')) {
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
  }, []);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      console.log('Cleaning up channel...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const setupRealtimeChannel = useCallback((sessionId: string) => {
    // Clean up existing channel
    cleanupChannel();

    addLog('info', `📡 Setting up realtime channel for session: ${sessionId}`);

    try {
      const channel = supabase
        .channel(`storage-scan-${sessionId}`)
        .on(
          'broadcast',
          { event: 'scan_progress' },
          (payload) => {
            console.log('📊 Progress update received:', payload);
            if (payload?.payload) {
              const data = payload.payload as ScanProgress;
              setProgress(data);
              
              // Only log significant progress updates
              if (data.processed % 10 === 0 || data.processed === data.total || data.status === 'completed' || data.status === 'error') {
                addLog('info', `📊 Progress: ${data.processed}/${data.total || '?'} - ${data.currentStep}`, 'progress');
              }
            }
          }
        )
        .on(
          'broadcast', 
          { event: 'scan_log' },
          (payload) => {
            console.log('📝 Log received:', payload);
            if (payload?.payload) {
              const logData = payload.payload;
              if (logData && logData.message) {
                // Determine log type based on message content
                let logType: 'match' | 'progress' | 'error' | 'info' = 'info';
                if (logData.message.includes('✅ Matched') || logData.message.includes('[SKU_MATCH]') || logData.message.includes('[UUID_MATCH]')) {
                  logType = 'match';
                } else if (logData.message.includes('❌') || logData.level === 'error') {
                  logType = 'error';
                } else if (logData.message.includes('batch') || logData.message.includes('Found') || logData.message.includes('Scanning')) {
                  logType = 'progress';
                }
                
                addLog(logData.level || 'info', logData.message, logType);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            addLog('info', '✅ Realtime channel connected successfully', 'info');
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            addLog('error', '❌ Realtime channel connection error', 'error');
          } else if (status === 'TIMED_OUT') {
            setIsConnected(false);
            addLog('warn', '⚠️ Realtime channel connection timeout', 'error');
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            addLog('info', '📡 Realtime channel closed', 'info');
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Failed to setup realtime channel:', error);
      addLog('error', `❌ Failed to setup realtime channel: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [addLog, cleanupChannel]);

  const handleScan = async () => {
    try {
      setIsProcessing(true);
      setProgress(null);
      setLogs([]);
      setIsConnected(false);
      
      addLog('info', '🔍 Starting storage bucket image scan...');

      // Get session token with better error handling
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      if (!sessionData?.session) {
        throw new Error('No active session. Please login and try again.');
      }

      addLog('info', '🔐 Authentication verified, invoking scan function...');

      // Invoke the edge function
      const { data, error } = await supabase.functions.invoke('scan-storage-images', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(`Function error: ${error.message || 'Failed to invoke function'}`);
      }

      if (!data) {
        throw new Error('No response from scan function');
      }

      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        addLog('info', `✅ Scan initiated with session: ${data.sessionId}`);
        
        // Setup realtime channel with a small delay
        setTimeout(() => {
          setupRealtimeChannel(data.sessionId);
        }, 500);
        
        toast({
          title: "Storage Scan Started",
          description: "Real-time progress will be shown below",
        });
      } else {
        throw new Error(data?.error || data?.message || "Storage scan failed to start");
      }
    } catch (error) {
      console.error('Storage scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog('error', `❌ Failed to start storage scan: ${errorMessage}`);
      toast({
        title: "Storage Scan Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    cleanupChannel();
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
    setSessionId(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'initializing': return 'bg-blue-500';
      case 'scanning': return 'bg-yellow-500';
      case 'processing': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = () => {
    if (!progress || !progress.total || progress.total === 0) return 0;
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
    if (log.level === 'warn') return 'text-yellow-600';
    return 'text-foreground';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, [cleanupChannel]);

  // Auto-stop when completed or error
  useEffect(() => {
    if (progress && (progress.status === 'completed' || progress.status === 'error')) {
      setIsProcessing(false);
      if (progress.status === 'completed') {
        toast({
          title: "Scan Completed",
          description: `Successfully matched ${progress.matchedProducts || 0} products to images`,
        });
      }
    }
  }, [progress, toast]);

  return (
    <div className="space-y-6">
      {/* Main Scanner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Storage Bucket Image Scanner
            {progress && (
              <Badge variant="outline" className={`${getStatusColor(progress.status)} text-white px-2`}>
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </Badge>
            )}
            {isConnected && (
              <Badge variant="outline" className="bg-green-500 text-white px-2">
                Connected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Scan the 'product-images' storage bucket and automatically match images to products based on SKU in filenames.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              This scanner searches all storage folders and matches images to products by SKU. It prioritizes exact SKU matches first, then handles multi-SKU files and fuzzy matching.
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
              disabled={isProcessing}
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
                  <span>Progress: {progress.processed} / {progress.total || '?'}</span>
                  <span>{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="w-full" />
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{progress.foundImages || 0}</div>
                  <div className="text-xs text-muted-foreground">Images Found</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">{progress.matchedProducts || 0}</div>
                  <div className="text-xs text-muted-foreground">Matched</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{progress.successful || 0}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{progress.failed || 0}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">
                    {progress.skuMatches || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">SKU Matches</div>
                </div>
                <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                  <div className="text-lg font-bold text-indigo-600">
                    {progress.multiMatchImages || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Multi-SKU</div>
                </div>
              </div>

              {/* Current File */}
              {progress.currentFile && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <strong>Processing:</strong> {progress.currentFile}
                  </span>
                </div>
              )}

              {/* Current Step */}
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Activity className="h-4 w-4" />
                <span className="text-sm">{progress.currentStep}</span>
              </div>
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
              <Badge variant="outline">{filteredLogs.length} entries</Badge>
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
              >
                Matches
              </Button>
              <Button
                variant={logFilter === 'progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('progress')}
              >
                Progress
              </Button>
              <Button
                variant={logFilter === 'errors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('errors')}
              >
                Errors
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 w-full border rounded-md p-4">
            <div className="space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {logs.length === 0 
                    ? "No logs yet. Start a scan to see real-time progress."
                    : `No ${logFilter} logs found.`
                  }
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-2 text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-base">{getLogIcon(log)}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </span>
                    <span className={`${getLogColor(log)} flex-1 font-mono text-xs break-all`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};