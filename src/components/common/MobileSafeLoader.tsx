
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface MobileSafeLoaderProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  fallback?: React.ReactNode;
}

export const MobileSafeLoader = ({ 
  children, 
  loading = false, 
  error = null,
  fallback 
}: MobileSafeLoaderProps) => {
  // Log loading states for mobile debugging
  React.useEffect(() => {
    console.log('[Mobile Safe Loader]', { loading, error: error?.message });
  }, [loading, error]);

  if (error) {
    console.error('[Mobile Safe Loader] Error:', error);
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">Something went wrong</p>
          <button 
            onClick={() => window.location.reload()}
            className="text-primary underline text-sm"
          >
            Refresh to try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return <>{children}</>;
};
