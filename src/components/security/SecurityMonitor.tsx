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
    
    // Lightweight monitoring only - remove performance-heavy operations
    setIsMonitoring(true);
    
    // Only track page visibility (lightweight)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('page_hidden', 'User tab became inactive', 'low');
      } else {
        logSecurityEvent('page_visible', 'User tab became active', 'low');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      setIsMonitoring(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Load recent security events for admin users (only once per user session)
  useEffect(() => {
    if (!user || !user.id) return;
    
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
    
    // Only load once per user session to prevent loops
    if (securityEvents.length === 0) {
      loadSecurityEvents();
    }
  }, [user?.id]); // Remove securityEvents from dependencies to prevent loops

  // Don't render anything visible - this is a background monitor
  return null;
};