import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniversalLoadingProps {
  variant?: "spinner" | "skeleton" | "page" | "card" | "list" | "grid";
  size?: "sm" | "md" | "lg";
  count?: number;
  className?: string;
  text?: string;
  fullPage?: boolean;
}

export const UniversalLoading = ({ 
  variant = "spinner", 
  size = "md", 
  count = 1, 
  className,
  text,
  fullPage = false
}: UniversalLoadingProps) => {
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
        <div className="h-4 bg-secondary/20 rounded" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="h-48 bg-secondary/20 rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-secondary/20 rounded w-3/4" />
            <div className="h-3 bg-secondary/15 rounded w-1/2" />
            <div className="h-5 bg-secondary/20 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="h-48 bg-secondary/20 rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-secondary/20 rounded w-3/4" />
                <div className="h-3 bg-secondary/15 rounded w-1/2" />
                <div className="h-5 bg-secondary/20 rounded w-1/3" />
              </div>
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
          <div key={i} className="animate-pulse">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-secondary/20 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary/20 rounded w-3/4" />
                  <div className="h-3 bg-secondary/15 rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-secondary/20 rounded" />
              </div>
            </div>
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
          <div className="h-8 bg-secondary/20 rounded w-1/3" />
          <div className="h-4 bg-secondary/15 rounded w-2/3" />
          
          {/* Content blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-secondary/20 rounded" />
            ))}
          </div>
          
          {/* Footer */}
          <div className="h-6 bg-secondary/15 rounded w-1/4 mt-8" />
        </div>
      </div>
    );
  }

  return null;
};