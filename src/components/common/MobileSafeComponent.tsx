
import React, { Suspense } from 'react';
import { MobileErrorBoundary } from './MobileErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

interface MobileSafeComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

export const MobileSafeComponent = ({ 
  children, 
  fallback,
  name = 'Component'
}: MobileSafeComponentProps) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-4 min-h-[100px]">
      <LoadingSpinner size="sm" />
    </div>
  );

  return (
    <MobileErrorBoundary
      fallback={
        <div className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            {name} temporarily unavailable
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="text-primary underline text-sm mt-2"
          >
            Refresh to try again
          </button>
        </div>
      }
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </MobileErrorBoundary>
  );
};
