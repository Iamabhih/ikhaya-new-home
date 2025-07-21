import { Skeleton } from "./skeleton-enhanced"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  type: "card" | "list" | "table" | "form" | "page"
  count?: number
  className?: string
}

export const LoadingState = ({ type, count = 1, className }: LoadingStateProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" variant="rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" variant="text" />
              <Skeleton className="h-4 w-1/2" variant="text" />
            </div>
          </div>
        )
      case "list":
        return (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12" variant="circular" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" variant="text" />
              <Skeleton className="h-4 w-2/3" variant="text" />
            </div>
          </div>
        )
      case "table":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4" variant="text" />
              ))}
            </div>
          </div>
        )
      case "form":
        return (
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/4" variant="text" />
            <Skeleton className="h-10 w-full" variant="rounded" />
          </div>
        )
      case "page":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/3" variant="text" />
              <Skeleton className="h-4 w-2/3" variant="text" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-48 w-full" variant="rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" variant="text" />
                    <Skeleton className="h-4 w-1/2" variant="text" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      default:
        return <Skeleton className="h-4 w-full" variant="text" />
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
}