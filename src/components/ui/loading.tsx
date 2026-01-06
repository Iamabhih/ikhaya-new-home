import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface LoadingProps {
  variant?: "spinner" | "skeleton" | "page" | "card" | "list" | "grid" | "table" | "form";
  size?: "sm" | "md" | "lg";
  count?: number;
  className?: string;
  text?: string;
  fullPage?: boolean;
}

/**
 * Unified Loading Component
 * Consolidates all loading/skeleton patterns across the application
 * Variants: spinner, skeleton, page, card, list, grid, table, form
 */
export const Loading = ({
  variant = "spinner",
  size = "md",
  count = 1,
  className,
  text,
  fullPage = false
}: LoadingProps) => {
  const baseClasses = fullPage ? "min-h-screen flex items-center justify-center" : "";

  if (variant === "spinner") {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8"
    };

    return (
      <div className={cn("flex flex-col items-center justify-center gap-3", baseClasses, className)}>
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("animate-pulse", className)}>
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 space-y-3">
            <Skeleton className="h-48 w-full" variant="rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" variant="text" />
              <Skeleton className="h-3 w-1/2" variant="text" />
              <Skeleton className="h-5 w-1/3" variant="text" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 space-y-3">
            <Skeleton className="h-48 w-full" variant="rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" variant="text" />
              <Skeleton className="h-3 w-1/2" variant="text" />
              <Skeleton className="h-5 w-1/3" variant="text" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12" variant="circular" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" variant="text" />
                <Skeleton className="h-3 w-1/2" variant="text" />
              </div>
              <Skeleton className="h-8 w-20" variant="rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4" variant="text" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-4 w-1/4" variant="text" />
            <Skeleton className="h-10 w-full" variant="rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("space-y-6 p-6", baseClasses, className)}>
        <div className="animate-pulse space-y-4">
          {/* Header */}
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-2/3" variant="text" />

          {/* Content blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" variant="rounded" />
            ))}
          </div>

          {/* Footer */}
          <Skeleton className="h-6 w-1/4 mt-8" variant="text" />
        </div>
      </div>
    );
  }

  return null;
};

// Legacy aliases for backward compatibility (will be removed in Phase 4)
export const UniversalLoading = Loading;
export const LoadingState = Loading;
export const LoadingSpinner = (props: Omit<LoadingProps, 'variant'>) => <Loading variant="spinner" {...props} />;
