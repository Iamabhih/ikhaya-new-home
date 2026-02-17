// Mobile optimization utilities
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 1024;
  return window.innerWidth;
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  return 'ontouchstart' in window ||
         navigator.maxTouchPoints > 0 ||
         (navigator as any).msMaxTouchPoints > 0;
};

// Check if running as PWA (standalone mode)
export const isPWAMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// Track scroll position for body scroll lock
let scrollPosition = 0;
let lockCount = 0;

// Lock body scroll (for modals, mobile menus)
// Uses ref-counting so nested locks/unlocks don't interfere
export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;

  lockCount++;
  if (lockCount > 1) return; // Already locked

  // Save current scroll position
  scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  document.documentElement.style.setProperty('--scroll-position', `-${scrollPosition}px`);
  document.body.classList.add('scroll-locked');
  // Set top to maintain visual position while body is fixed
  document.body.style.top = `-${scrollPosition}px`;
};

// Unlock body scroll and restore position
export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return; // Still locked by another caller

  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
  document.documentElement.style.removeProperty('--scroll-position');

  // Restore scroll position using instant behavior to avoid visual jump
  window.scrollTo({ top: scrollPosition, behavior: 'instant' as ScrollBehavior });
};

// Check if body scroll is locked
export const isBodyScrollLocked = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.body.classList.contains('scroll-locked');
};

export const applyMobileOptimizations = (): void => {
  if (typeof document === 'undefined') return;

  // Prevent zoom on iOS when focusing inputs
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const element = input as HTMLElement;
    if (element.style.fontSize === '' || parseFloat(element.style.fontSize) < 16) {
      element.style.fontSize = '16px';
    }
  });

  // Add touch optimizations
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
  }

  // Add PWA mode class for specific styles
  if (isPWAMode()) {
    document.body.classList.add('pwa-mode');
  }

  // Set CSS custom properties for viewport dimensions
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };

  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    // Delay to allow orientation change to complete
    setTimeout(setViewportHeight, 100);
  });

  // Handle visual viewport changes (virtual keyboard)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        `${window.visualViewport!.height}px`
      );
    });
  }
};

// Breakpoints match tailwind.config.ts screens
export const getMobileBreakpoint = (width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (width < 375) return 'xs';
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1280) return 'xl';
  return '2xl';
};

export const optimizeImageForMobile = (url: string, breakpoint: string): string => {
  if (!url) return url;
  
  // Add mobile-specific image parameters if needed
  const params = new URLSearchParams();
  
  switch (breakpoint) {
    case 'xs':
      params.append('w', '320');
      params.append('q', '80');
      break;
    case 'sm':
      params.append('w', '640');
      params.append('q', '85');
      break;
    case 'md':
      params.append('w', '768');
      params.append('q', '90');
      break;
    default:
      return url;
  }
  
  // Only apply if URL supports query parameters
  if (url.includes('?') || url.includes('&')) {
    return `${url}&${params.toString()}`;
  }
  
  return url;
};