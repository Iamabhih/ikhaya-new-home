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
  
  // Set CSS custom properties for viewport dimensions
  const setViewportHeight = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', setViewportHeight);
};

export const getMobileBreakpoint = (width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (width < 480) return 'xs';
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