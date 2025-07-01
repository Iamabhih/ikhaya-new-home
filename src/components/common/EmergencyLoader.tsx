
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface EmergencyLoaderProps {
  children: React.ReactNode;
  timeout?: number;
}

export const EmergencyLoader = ({ children, timeout = 10000 }: EmergencyLoaderProps) => {
  const [showEmergency, setShowEmergency] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    // Set a timeout for emergency fallback
    const timer = setTimeout(() => {
      if (!hasLoaded) {
        console.warn('[Emergency Loader] Timeout reached, showing emergency fallback');
        setShowEmergency(true);
      }
    }, timeout);

    // Mark as loaded when component mounts successfully
    const loadTimer = setTimeout(() => {
      setHasLoaded(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(loadTimer);
    };
  }, [timeout, hasLoaded]);

  if (showEmergency) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4 max-w-md">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading Taking Longer Than Expected</h2>
            <p className="text-muted-foreground">
              The app is still loading. This might take a moment on slower connections.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
