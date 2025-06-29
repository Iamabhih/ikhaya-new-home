
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ImportProgressTrackerProps {
  importId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface ImportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  filename: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export const ImportProgressTracker = ({ importId, onComplete, onError }: ImportProgressTrackerProps) => {
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImportStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('product_imports')
          .select('*')
          .eq('id', importId)
          .single();

        if (error) throw error;
        setImportStatus(data);

        // Fetch errors if import failed or has failed rows
        if (data.failed_rows > 0) {
          const { data: errorData, error: errorError } = await supabase
            .from('product_import_errors')
            .select('*')
            .eq('import_id', importId)
            .order('row_number', { ascending: true });

          if (!errorError) {
            setErrors(errorData || []);
          }
        }

        // Call completion callback if import is done
        if (data.status === 'completed' && onComplete) {
          onComplete();
        } else if (data.status === 'failed' && onError) {
          onError(data.error_message || 'Import failed');
        }
      } catch (error: any) {
        console.error('Error fetching import status:', error);
        if (onError) onError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImportStatus();

    // Set up polling for active imports
    let interval: NodeJS.Timeout;
    if (importStatus?.status === 'processing' || importStatus?.status === 'pending') {
      interval = setInterval(fetchImportStatus, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [importId, importStatus?.status, onComplete, onError]);

  const downloadErrorReport = () => {
    if (errors.length === 0) return;

    const csv = [
      'Row Number,Error Message,Product Data',
      ...errors.map(error => 
        `${error.row_number},"${error.error_message}","${JSON.stringify(error.row_data).replace(/"/g, '""')}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${importId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading import status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!importStatus) {
    return (
      <Alert>
        <XCircle className="h-4 w-4" />
        <AlertDescription>Import not found</AlertDescription>
      </Alert>
    );
  }

  const progressPercentage = importStatus.total_rows > 0 
    ? (importStatus.processed_rows / importStatus.total_rows) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(importStatus.status)}
          Import Progress: {importStatus.filename}
          {getStatusBadge(importStatus.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{importStatus.processed_rows} / {importStatus.total_rows} rows</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {importStatus.successful_rows}
            </div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {importStatus.failed_rows}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {importStatus.total_rows}
            </div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>

        {importStatus.status === 'processing' && (
          <div className="text-center text-sm text-muted-foreground">
            Import in progress... This may take a few minutes.
          </div>
        )}

        {importStatus.status === 'completed' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Import completed successfully! {importStatus.successful_rows} products were imported.
              {importStatus.completed_at && (
                <div className="mt-1 text-xs">
                  Completed at: {new Date(importStatus.completed_at).toLocaleString()}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {importStatus.status === 'failed' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Import failed: {importStatus.error_message}
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Import Errors ({errors.length})</h4>
              <Button onClick={downloadErrorReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm p-2 bg-red-50 rounded">
                  <strong>Row {error.row_number}:</strong> {error.error_message}
                </div>
              ))}
              {errors.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  And {errors.length - 5} more errors...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
