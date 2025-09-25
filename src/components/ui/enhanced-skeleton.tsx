import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "card" | "text" | "chart";
  animate?: boolean;
}

const EnhancedSkeleton = ({
  className,
  variant = "default",
  animate = true,
  ...props
}: EnhancedSkeletonProps) => {
  const baseClasses = cn(
    "bg-gradient-to-r from-muted/50 via-muted to-muted/50 rounded-md",
    animate && "animate-pulse",
    className
  );

  const variantClasses = {
    default: "h-4 bg-muted rounded",
    circle: "rounded-full",
    card: "h-32 w-full rounded-lg",
    text: "h-4 w-3/4 rounded",
    chart: "h-[300px] w-full rounded-lg"
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant])}
      {...props}
    />
  );
};

EnhancedSkeleton.displayName = "EnhancedSkeleton";

export { EnhancedSkeleton };