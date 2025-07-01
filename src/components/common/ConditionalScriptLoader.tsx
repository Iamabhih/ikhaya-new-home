
import React, { useEffect } from 'react';

interface ConditionalScriptLoaderProps {
  children: React.ReactNode;
}

export const ConditionalScriptLoader = ({ children }: ConditionalScriptLoaderProps) => {
  useEffect(() => {
    const loadScript = async () => {
      try {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="gptengineer.js"]');
        if (existingScript) {
          console.log('[Script Loader] GPTEngineer script already loaded');
          return;
        }

        // Only load in production or if explicitly enabled
        const shouldLoad = process.env.NODE_ENV === 'production' || 
                          window.location.search.includes('loadGPTScript=true');

        if (!shouldLoad) {
          console.log('[Script Loader] Skipping GPTEngineer script in development');
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.gpteng.co/gptengineer.js';
        script.type = 'module';
        script.async = true;
        
        script.onload = () => {
          console.log('[Script Loader] GPTEngineer script loaded successfully');
        };
        
        script.onerror = (error) => {
          console.warn('[Script Loader] Failed to load GPTEngineer script (non-critical):', error);
          // Remove failed script element
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          if (script.parentNode) {
            console.warn('[Script Loader] GPTEngineer script timeout, removing');
            script.parentNode.removeChild(script);
          }
        }, 10000);

        script.onload = () => {
          clearTimeout(timeout);
          console.log('[Script Loader] GPTEngineer script loaded successfully');
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn('[Script Loader] Error loading script (non-critical):', error);
        // Don't throw error - app should work without it
      }
    };

    // Load script after a delay to not block initial render
    const timer = setTimeout(loadScript, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
};
