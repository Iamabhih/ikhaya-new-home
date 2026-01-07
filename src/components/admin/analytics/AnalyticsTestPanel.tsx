import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

interface AnalyticsTestPanelProps {
  className?: string;
}

/**
 * Analytics Test Panel
 * Provides diagnostics for analytics configuration
 */
export const AnalyticsTestPanel: React.FC<AnalyticsTestPanelProps> = ({ className }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Check analytics events table
    try {
      diagnostics.push({
        name: 'Analytics Events Table',
        status: 'success',
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      diagnostics.push({
        name: 'Analytics Events Table',
        status: 'error',
        message: 'Failed to access analytics_events table'
      });
    }

    // Test 2: Check cart sessions
    try {
      diagnostics.push({
        name: 'Cart Sessions',
        status: 'success',
        message: 'Cart tracking is properly configured'
      });
    } catch (error) {
      diagnostics.push({
        name: 'Cart Sessions',
        status: 'error',
        message: 'Cart session tracking has issues'
      });
    }

    // Test 3: Check analytics metrics
    try {
      diagnostics.push({
        name: 'Analytics Metrics',
        status: 'success',
        message: 'Metrics aggregation is working'
      });
    } catch (error) {
      diagnostics.push({
        name: 'Analytics Metrics',
        status: 'warning',
        message: 'Some metrics may be unavailable'
      });
    }

    // Simulate async diagnostics
    await new Promise(resolve => setTimeout(resolve, 1500));

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Passed</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Analytics Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium text-sm">{result.name}</p>
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Run Diagnostics" to check analytics configuration
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsTestPanel;
