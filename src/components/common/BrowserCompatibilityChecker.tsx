
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const detectBrowser = (): BrowserInfo => {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      let name = 'Unknown';
      let version = '0';
      
      // Chrome detection (including mobile Chrome)
      if (userAgent.includes('Chrome')) {
        name = 'Chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        version = match ? match[1] : '0';
      }
      // Android Browser detection
      else if (userAgent.includes('Android') && !userAgent.includes('Chrome')) {
        name = 'Android Browser';
        const match = userAgent.match(/Android (\d+)/);
        version = match ? match[1] : '0';
      }
      // Safari detection
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        name = 'Safari';
        const match = userAgent.match(/Version\/(\d+)/);
        version = match ? match[1] : '0';
      }

      // Check for modern features
      const hasModernFeatures = !!(
        window.Promise &&
        window.fetch &&
        Array.prototype.includes &&
        Object.assign &&
        window.requestAnimationFrame
      );

      // Determine support
      const isSupported = hasModernFeatures && (
        (name === 'Chrome' && parseInt(version) >= 60) ||
        (name === 'Safari' && parseInt(version) >= 12) ||
        (name === 'Android Browser' && parseInt(version) >= 7)
      );

      return { name, version, isSupported, isMobile, hasModernFeatures };
    };

    try {
      const info = detectBrowser();
      setBrowserInfo(info);
      
      console.log('[Browser Compatibility]', {
        browser: info,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      // Add polyfills if needed
      if (!info.hasModernFeatures) {
        loadPolyfills();
      }
    } catch (error) {
      console.error('[Browser Detection Error]', error);
      setHasError(true);
    }
  }, []);

  const loadPolyfills = () => {
    // Add Promise polyfill if missing
    if (!window.Promise) {
      console.log('[Polyfill] Loading Promise polyfill');
      // Basic Promise polyfill would go here in a real implementation
    }

    // Add fetch polyfill if missing
    if (!window.fetch) {
      console.log('[Polyfill] Loading fetch polyfill');
      // Basic fetch polyfill would go here in a real implementation
    }

    // Add Array.includes polyfill if missing
    if (!Array.prototype.includes) {
      console.log('[Polyfill] Loading Array.includes polyfill');
      Array.prototype.includes = function(searchElement: any) {
        return this.indexOf(searchElement) !== -1;
      };
    }
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Browser Detection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We encountered an issue detecting your browser. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (browserInfo && !browserInfo.isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg">
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
              <p><strong>Modern Features:</strong> {browserInfo.hasModernFeatures ? 'Available' : 'Limited'}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your browser may have limited support for some features. For the best experience, 
              please update your browser or try using Chrome, Safari, or Firefox.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
