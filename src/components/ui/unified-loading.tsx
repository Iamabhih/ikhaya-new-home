import { Loader2 } from "lucide-react";
import { LoadingState } from "./loading-state";
import { Skeleton } from "./skeleton-enhanced";
import { cn } from "@/lib/utils";

interface UnifiedLoadingProps {
  type?: "spinner" | "skeleton" | "card" | "list" | "table" | "form" | "page";
  size?: "sm" | "md" | "lg";
  count?: number;
  className?: string;
  text?: string;
}

export const UnifiedLoading = ({ 
  type = "spinner", 
  size = "md", 
  count = 1, 
  className,
  text 
}: UnifiedLoadingProps) => {
  if (type === "spinner") {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-6 w-6", 
      lg: "h-8 w-8"
    };

    return (
      <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }

  if (type === "skeleton") {
    return <Skeleton className={cn("h-4 w-full", className)} />;
  }

  return <LoadingState type={type} count={count} className={className} />;
};