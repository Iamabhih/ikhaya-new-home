import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/security';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_description: string;
  risk_level: string;
  created_at: string;
  metadata: any;
}

export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Start monitoring user session
    setIsMonitoring(true);
    
    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('page_hidden', 'User tab became inactive', 'low');
      } else {
        logSecurityEvent('page_visible', 'User tab became active', 'low');
      }
    };
    
    // Track unusual navigation patterns
    const handleBeforeUnload = () => {
      logSecurityEvent('page_unload', 'User leaving page', 'low');
    };
    
    // Monitor console access (potential developer tools usage)
    const originalConsole = window.console;
    let consoleAccessCount = 0;
    
    const monitorConsole = () => {
      consoleAccessCount++;
      if (consoleAccessCount > 5) {
        logSecurityEvent(
          'console_access_detected', 
          'Multiple console accesses detected - possible developer tools usage', 
          'medium',
          { accessCount: consoleAccessCount }
        );
      }
    };
    
    // Override console methods to detect usage
    ['log', 'warn', 'error', 'debug'].forEach(method => {
      const original = originalConsole[method as keyof Console];
      (window.console as any)[method] = function(...args: any[]) {
        monitorConsole();
        return (original as any).apply(originalConsole, args);
      };
    });
    
    // Monitor for suspicious DOM manipulation
    const observer = new MutationObserver((mutations) => {
      const suspiciousMutations = mutations.filter(mutation => {
        const target = mutation.target as Element;
        return target.tagName === 'SCRIPT' || target.tagName === 'IFRAME';
      });
      
      if (suspiciousMutations.length > 0) {
        logSecurityEvent(
          'suspicious_dom_manipulation',
          'Detected suspicious DOM changes',
          'high',
          { mutationCount: suspiciousMutations.length }
        );
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // Track failed requests that might indicate probing
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args);
        if (!response.ok && response.status === 403) {
          logSecurityEvent(
            'unauthorized_request',
            `Unauthorized request attempt: ${args[0]}`,
            'medium',
            { url: args[0], status: response.status }
          );
        }
        return response;
      } catch (error) {
        return originalFetch.apply(this, args);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      setIsMonitoring(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      observer.disconnect();
      
      // Restore original console
      Object.assign(window.console, originalConsole);
      window.fetch = originalFetch;
    };
  }, [user]);

  // Load recent security events for admin users
  useEffect(() => {
    if (!user) return;
    
    const loadSecurityEvents = async () => {
      try {
        const { data } = await supabase
          .from('security_audit_log')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data) {
          setSecurityEvents(data);
        }
      } catch (error) {
        console.error('Failed to load security events:', error);
      }
    };
    
    loadSecurityEvents();
  }, [user]);

  // Don't render anything visible - this is a background monitor
  return null;
};