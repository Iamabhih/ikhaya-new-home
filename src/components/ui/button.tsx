import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-modern-sm hover:shadow-modern-md hover:-translate-y-0.5 rounded-lg hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-modern-sm hover:shadow-modern-md hover:-translate-y-0.5 rounded-lg hover:bg-destructive/90",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-modern-sm hover:border-primary/20 rounded-lg",
        secondary:
          "bg-secondary text-secondary-foreground shadow-modern-sm hover:shadow-modern-md hover:-translate-y-0.5 rounded-lg hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 rounded-lg",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 rounded-none",
        premium: "bg-gradient-primary text-primary-foreground shadow-modern-md hover:shadow-modern-lg hover:-translate-y-1 rounded-lg border border-primary/20",
        accent: "bg-accent text-accent-foreground shadow-modern-sm hover:shadow-modern-md hover:-translate-y-0.5 rounded-lg hover:bg-accent/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
