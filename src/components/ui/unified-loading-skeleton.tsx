import { Skeleton } from "./skeleton-enhanced";
import { cn } from "@/lib/utils";

interface UnifiedLoadingSkeletonProps {
  type: "products-grid" | "products-list" | "product-card" | "search-results";
  count?: number;
  className?: string;
}

export const UnifiedLoadingSkeleton = ({ 
  type, 
  count = 1, 
  className 
}: UnifiedLoadingSkeletonProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case "products-grid":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-card border rounded-lg p-4 space-y-3 h-48">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-20" />
                  <div className="flex gap-2 mt-auto pt-4">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case "products-list":
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <div className="flex items-center gap-6">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case "product-card":
        return (
          <div className="animate-pulse">
            <div className="bg-card border rounded-lg p-4 space-y-3 h-48">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-6 w-20" />
              <div className="flex gap-2 mt-auto pt-4">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          </div>
        );
      
      case "search-results":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-card border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return <Skeleton className="h-4 w-full" />;
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {renderSkeleton()}
    </div>
  );
};