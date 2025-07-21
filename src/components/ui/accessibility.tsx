import { cn } from "@/lib/utils"
import { forwardRef } from "react"

// Skip Link Component for screen readers
export const SkipLink = ({ href = "#main-content", children = "Skip to main content" }) => (
  <a
    href={href}
    className="skip-link focus:not-sr-only sr-only"
    tabIndex={0}
  >
    {children}
  </a>
)

// Accessible Focus Trap Component
interface FocusTrapProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
}

export const FocusTrap = forwardRef<HTMLDivElement, FocusTrapProps>(
  ({ children, active = true, className, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!active || e.key !== 'Tab') return
      
      const focusableElements = e.currentTarget.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    return (
      <div
        ref={ref}
        className={cn("focus-trap", className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    )
  }
)

FocusTrap.displayName = "FocusTrap"

// Screen Reader Only Text Component
export const ScreenReaderOnly = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

// Live Region for announcements
interface LiveRegionProps {
  children: React.ReactNode
  level?: "polite" | "assertive" | "off"
  atomic?: boolean
}

export const LiveRegion = ({ children, level = "polite", atomic = true }: LiveRegionProps) => (
  <div
    aria-live={level}
    aria-atomic={atomic}
    className="sr-only"
  >
    {children}
  </div>
)