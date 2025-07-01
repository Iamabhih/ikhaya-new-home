
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  isMobile: boolean;
  hasModernFeatures: boolean;
}

interface BrowserCompatibilityCheckerProps {
  children: React.ReactNode;
}

export const BrowserCompatibilityChecker = ({ children }: BrowserCompatibilityCheckerProps) => {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const detectBrowser = (): BrowserInfo => {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      let name = 'Unknown';
      let version = '0';
      
      // More permissive browser detection
      if (userAgent.includes('Chrome') || userAgent.includes('CriOS')) {
        name = 'Chrome';
        const match = userAgent.match(/(?:Chrome|CriOS)\/(\d+)/);
        version = match ? match[1] : '0';
      }
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        name = 'Safari';
        const match = userAgent.match(/Version\/(\d+)/);
        version = match ? match[1] : '0';
      }
      else if (userAgent.includes('Firefox') || userAgent.includes('FxiOS')) {
        name = 'Firefox';
        const match = userAgent.match(/(?:Firefox|FxiOS)\/(\d+)/);
        version = match ? match[1] : '0';
      }
      else if (userAgent.includes('Android')) {
        name = 'Android Browser';
        const match = userAgent.match(/Android (\d+)/);
        version = match ? match[1] : '0';
      }

      // Check for modern features with fallbacks
      const hasModernFeatures = !!(
        (window.Promise || typeof Promise !== 'undefined') &&
        (window.fetch || typeof fetch !== 'undefined') &&
        (Array.prototype.includes || true) && // We'll polyfill this
        (Object.assign || true) // We'll polyfill this
      );

      // Very permissive support - only block very old browsers
      const isSupported = hasModernFeatures && (
        (name === 'Chrome' && parseInt(version) >= 50) ||
        (name === 'Safari' && parseInt(version) >= 10) ||
        (name === 'Firefox' && parseInt(version) >= 50) ||
        (name === 'Android Browser' && parseInt(version) >= 5) ||
        name === 'Unknown' // Allow unknown browsers to try
      );

      return { name, version, isSupported, isMobile, hasModernFeatures };
    };

    try {
      const info = detectBrowser();
      setBrowserInfo(info);
      
      console.log('[Browser Compatibility] Detected:', {
        browser: info,
        userAgent: navigator.userAgent
      });

      // Only show warning for very old browsers, don't block
      if (!info.isSupported && info.name !== 'Unknown') {
        setShowWarning(true);
        // Auto-hide warning after 5 seconds
        setTimeout(() => setShowWarning(false), 5000);
      }

      // Add polyfills if needed
      if (!info.hasModernFeatures) {
        loadPolyfills();
      }
    } catch (error) {
      console.error('[Browser Detection] Error (continuing anyway):', error);
      // Continue loading even if detection fails
    }
  }, []);

  const loadPolyfills = () => {
    // Add basic polyfills
    if (!Array.prototype.includes) {
      Array.prototype.includes = function(searchElement: any) {
        return this.indexOf(searchElement) !== -1;
      };
    }

    if (!Object.assign) {
      Object.assign = function(target: any, ...sources: any[]) {
        sources.forEach(source => {
          Object.keys(source).forEach(key => {
            target[key] = source[key];
          });
        });
        return target;
      };
    }
  };

  // Show compatibility warning as overlay, but don't block the app
  if (showWarning && browserInfo && !browserInfo.isSupported) {
    return (
      <>
        {children}
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Browser Compatibility Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <p><strong>Browser:</strong> {browserInfo.name} {browserInfo.version}</p>
                <p><strong>Device:</strong> {browserInfo.isMobile ? 'Mobile' : 'Desktop'}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your browser may have limited support. For the best experience, please update your browser.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowWarning(false)} variant="outline" className="flex-1">
                  Continue Anyway
                </Button>
                <Button onClick={() => window.location.reload()} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
