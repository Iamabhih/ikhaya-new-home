
import React, { useEffect } from 'react';

interface ConditionalScriptLoaderProps {
  children: React.ReactNode;
}

export const ConditionalScriptLoader = ({ children }: ConditionalScriptLoaderProps) => {
  useEffect(() => {
    const shouldLoadScript = () => {
      // Don't load script on problematic browsers
      const userAgent = navigator.userAgent;
      const isProblematicBrowser = 
        (userAgent.includes('Android') && !userAgent.includes('Chrome')) ||
        (userAgent.includes('Chrome') && userAgent.includes('Mobile'));
      
      // Don't load in development if it's causing issues
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return !isProblematicBrowser || !isDevelopment;
    };

    const loadScript = async () => {
      if (!shouldLoadScript()) {
        console.log('[Script Loader] Skipping GPTEngineer script for compatibility');
        return;
      }

      try {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="gptengineer.js"]');
        if (existingScript) {
          console.log('[Script Loader] GPTEngineer script already loaded');
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
          console.warn('[Script Loader] Failed to load GPTEngineer script:', error);
          // Don't throw error - app should work without it
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn('[Script Loader] Error loading script:', error);
        // Don't throw error - app should work without it
      }
    };

    // Load script after a small delay to ensure DOM is ready
    const timer = setTimeout(loadScript, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
};
