import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, CheckCircle, AlertCircle, ExternalLink, Clock, 
  FileImage, Activity, Pause, Play, Square, RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MigrationProgress {
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
  estimatedTimeRemaining?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export const ImageMigrationTool = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (level: 'info' | 'warn' | 'error', message: string) => {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [...prev, logEntry]);
  };

  const setupRealtimeChannel = (sessionId: string) => {
    addLog('info', `🔗 Setting up real-time channel for session: ${sessionId}`);
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`migration-${sessionId}`)
      .on(
        'broadcast',
        { event: 'migration_progress' },
        (payload) => {
          console.log('📡 Received progress update:', payload);
          const data = payload.payload as MigrationProgress;
          setProgress(data);
          
          if (data.currentStep) {
            addLog('info', data.currentStep);
          }
          
          if (data.errors && data.errors.length > 0) {
            data.errors.forEach(error => addLog('error', error));
          }
          
          // Handle migration completion
          if (data.status === 'completed') {
            setIsProcessing(false);
            addLog('info', '🎉 Migration completed successfully!');
            toast({
              title: "Migration Completed",
              description: `Successfully processed ${data.successful} images`,
            });
          } else if (data.status === 'error') {
            setIsProcessing(false);
            addLog('error', '💥 Migration failed with errors');
            toast({
              title: "Migration Failed",
              description: "Check the logs for details",
              variant: "destructive",
            });
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        console.log('🔄 Channel presence synced');
        addLog('info', '🔄 Real-time connection established');
      })
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          addLog('info', '✅ Connected to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          addLog('error', '❌ Real-time connection failed');
        }
      });

    channelRef.current = channel;
  };

  const handleMigration = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    setProgress(null);
    setLogs([]);
    
    addLog('info', '🚀 Starting image migration process...');
    addLog('info', '📋 Initializing connection to migration service...');

    try {
      console.log('🔧 Invoking migration function...');
      const { data, error } = await supabase.functions.invoke('migrate-drive-images', {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📥 Migration function response:', { data, error });

      if (error) {
        console.error('❌ Migration function error:', error);
        throw new Error(`Migration service error: ${error.message}`);
      }

      if (data?.success) {
        console.log('✅ Migration started successfully, session:', data.sessionId);
        setSessionId(data.sessionId);
        setupRealtimeChannel(data.sessionId);
        
        addLog('info', `✅ Migration service started (Session: ${data.sessionId})`);
        toast({
          title: "Migration Started",
          description: "Real-time progress will be shown below",
        });
      } else {
        console.error('❌ Migration failed to start:', data);
        throw new Error(data?.error || "Migration failed to start - check function logs");
      }
    } catch (error) {
      console.error('💥 Migration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog('error', `❌ Failed to start migration: ${errorMessage}`);
      addLog('error', '💡 Check the edge function logs for more details');
      toast({
        title: "Migration Failed",
        description: errorMessage,
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
    setIsPaused(false);
    addLog('warn', '⏹️ Migration stopped by user');
    toast({
      title: "Migration Stopped",
      description: "The migration process has been stopped",
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

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Migration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Google Drive Image Migration
            {progress && (
              <Badge variant="outline" className={`${getStatusColor(progress.status)} text-white`}>
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Automatically migrate product images from Google Drive to Supabase storage with real-time progress tracking.
            Images should be named with SKU (e.g., "ABC123.jpg" or "ABC123.png").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will download images from your Google Drive folder and upload them to Supabase storage.
              Existing images will be replaced. The process includes retry logic and batch processing for reliability.
            </AlertDescription>
          </Alert>

          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleMigration} 
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isProcessing ? "Migration Running..." : "Start Migration"}
            </Button>
            
            {isProcessing && (
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Migration
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
            
            <a
              href="https://drive.google.com/drive/u/1/folders/1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              View Google Drive Folder
            </a>
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
                {progress.estimatedTimeRemaining && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Estimated time remaining: {progress.estimatedTimeRemaining}
                  </div>
                )}
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xl font-bold">{progress.processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{progress.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{progress.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{progress.total}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>

              {/* Current File */}
              {progress.currentFile && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <FileImage className="h-4 w-4 text-blue-600" />
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Migration Logs
            <Badge variant="outline">{logs.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80 w-full border rounded-md p-4">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No logs yet. Start a migration to see real-time progress.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </span>
                    <Badge 
                      variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'outline' : 'secondary'}
                      className="text-xs px-1"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className={
                      log.level === 'error' ? 'text-red-600' : 
                      log.level === 'warn' ? 'text-yellow-600' : 
                      'text-foreground'
                    }>
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