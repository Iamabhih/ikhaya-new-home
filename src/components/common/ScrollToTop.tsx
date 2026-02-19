import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that scrolls to top of page on route changes.
 *
 * Resets scrollTop on window, html, and body so that the behaviour is
 * correct across standard browsers, iOS Safari, and PWA mode regardless
 * of which element is the active scroll container.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the window/viewport (standard browsers)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Also reset html and body directly in case either is the active scroll
    // container (can happen in certain iOS / PWA CSS configurations)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};
