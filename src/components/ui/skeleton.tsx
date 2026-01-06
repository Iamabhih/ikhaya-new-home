import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "text" | "circular" | "rounded"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variants = {
    default: "rounded-md",
    text: "rounded-sm h-4",
    circular: "rounded-full",
    rounded: "rounded-lg"
  }

  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-muted via-muted/80 to-muted",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
export type { SkeletonProps }
