import { ReactNode } from "react";
import { UniversalLoading } from "./universal-loading";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface LoadingWrapperProps {
  isLoading: boolean;
  loadingVariant?: "spinner" | "skeleton" | "page" | "card" | "list" | "grid";
  loadingText?: string;
  loadingCount?: number;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export const LoadingWrapper = ({
  isLoading,
  loadingVariant = "spinner",
  loadingText,
  loadingCount = 1,
  error,
  isEmpty = false,
  emptyMessage = "No data available",
  children,
  className
}: LoadingWrapperProps) => {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-destructive font-bold">!</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Error</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <UniversalLoading 
        variant={loadingVariant}
        text={loadingText}
        count={loadingCount}
        className={className}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-muted-foreground">📭</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Data</h3>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};