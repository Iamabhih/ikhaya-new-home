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
        "animate-pulse bg-gradient-to-r from-muted via-muted/80 to-muted bg-[length:200%_100%] animate-[shimmer_2s_infinite]",
        variants[variant],
        className
      )}
      style={{
        backgroundImage: `linear-gradient(
          90deg,
          hsl(var(--muted)) 0%,
          hsl(var(--muted)/0.8) 50%,
          hsl(var(--muted)) 100%
        )`,
        animation: "shimmer 2s infinite"
      }}
      {...props}
    />
  )
}

export { Skeleton }