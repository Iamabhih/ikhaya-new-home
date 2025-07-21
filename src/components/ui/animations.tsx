import { cn } from "@/lib/utils"
import { forwardRef } from "react"

// Stagger Animation Container
interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, delay = 0.1, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("space-y-4", className)}
      style={{
        "--stagger-delay": `${delay}s`
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
)

StaggerContainer.displayName = "StaggerContainer"

// Fade In Animation Component
interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
  direction?: "up" | "down" | "left" | "right"
  duration?: number
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ 
    children, 
    delay = 0, 
    direction = "up", 
    duration = 0.5,
    className, 
    ...props 
  }, ref) => {
    const directionClasses = {
      up: "animate-slide-up",
      down: "animate-slide-down", 
      left: "animate-slide-in-left",
      right: "animate-slide-in-right"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "opacity-0 animate-fade-in",
          directionClasses[direction],
          className
        )}
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          animationFillMode: "forwards"
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

FadeIn.displayName = "FadeIn"

// Hover Scale Component
interface HoverScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  scale?: number
}

export const HoverScale = forwardRef<HTMLDivElement, HoverScaleProps>(
  ({ children, scale = 1.05, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "transition-transform duration-200 ease-out hover:cursor-pointer",
        className
      )}
      style={{
        "--hover-scale": scale
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${scale})`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
      }}
      {...props}
    >
      {children}
    </div>
  )
)

HoverScale.displayName = "HoverScale"

// Floating Animation Component
export const FloatingElement = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-[float_6s_ease-in-out_infinite]", className)}
      {...props}
    >
      {children}
    </div>
  )
)

FloatingElement.displayName = "FloatingElement"

// Pulse Component
interface PulseProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "soft" | "medium" | "strong"
}

export const Pulse = forwardRef<HTMLDivElement, PulseProps>(
  ({ children, intensity = "medium", className, ...props }, ref) => {
    const intensityClasses = {
      soft: "animate-pulse-soft",
      medium: "animate-pulse",
      strong: "animate-[pulse_1s_ease-in-out_infinite]"
    }

    return (
      <div
        ref={ref}
        className={cn(intensityClasses[intensity], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Pulse.displayName = "Pulse"