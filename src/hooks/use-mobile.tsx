
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize with a safe default based on window availability
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Safe server-side default
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  })

  React.useEffect(() => {
    // Function to check if we're on mobile
    const checkIsMobile = () => {
      return window.innerWidth < MOBILE_BREAKPOINT
    }

    // Set initial value (in case the initial state was wrong)
    const currentMobile = checkIsMobile();
    if (currentMobile !== isMobile) {
      setIsMobile(currentMobile);
    }

    // Create media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      const newIsMobile = checkIsMobile();
      console.log('[Mobile Hook] Screen size changed:', { 
        width: window.innerWidth, 
        isMobile: newIsMobile 
      });
      setIsMobile(newIsMobile);
    }

    // Add listener
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else {
      // Fallback for older browsers
      mql.addListener(onChange)
    }

    // Cleanup function
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else {
        mql.removeListener(onChange)
      }
    }
  }, [])

  return isMobile
}
