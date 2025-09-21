import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface OrderErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface OrderErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class OrderErrorBoundary extends React.Component<
  OrderErrorBoundaryProps,
  OrderErrorBoundaryState
> {
  constructor(props: OrderErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): OrderErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Order Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Order Loading Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              There was an error loading the order information. This might be due to:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Network connectivity issues</li>
              <li>Server temporarily unavailable</li>
              <li>Invalid order data</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="default" 
                size="sm"
              >
                Reload Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}