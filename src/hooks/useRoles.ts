import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'customer' | 'admin' | 'manager' | 'superadmin';

export const useRoles = (user: User | null) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const rolesCache = useRef<{ [key: string]: { roles: AppRole[], timestamp: number } }>({});

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) {
        setRoles([]);
        setLoading(false);
        lastUserIdRef.current = null;
        return;
      }

      // Check cache first - cache for 5 minutes
      const cacheEntry = rolesCache.current[user.id];
      const now = Date.now();
      if (cacheEntry && (now - cacheEntry.timestamp) < 300000) {
        setRoles(cacheEntry.roles);
        setLoading(false);
        return;
      }

      // Prevent duplicate fetches for the same user
      if (lastUserIdRef.current === user.id && fetchingRef.current) {
        return;
      }

      try {
        setLoading(true);
        fetchingRef.current = true;
        lastUserIdRef.current = user.id;
        
        console.log('Fetching roles for user ID:', user.id);
        
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Current auth session user ID:', sessionData?.session?.user?.id);
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        console.log('Role fetch result:', { data, error });

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
          lastUserIdRef.current = null; // Reset on error to allow retry
        } else {
          const userRoles = data?.map(r => r.role as AppRole) || [];
          console.log('Processed user roles:', userRoles);
          setRoles(userRoles);
          // Cache the result with timestamp
          rolesCache.current[user.id] = { roles: userRoles, timestamp: now };
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
        lastUserIdRef.current = null; // Reset on error to allow retry
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchRoles();
  }, [user?.id]);

  const hasRole = (role: AppRole): boolean => {
    const result = roles.includes(role);
    console.log(`[useRoles] hasRole(${role}): ${result}, current roles:`, roles);
    return result;
  };

  const isAdmin = (): boolean => {
    const result = hasRole('admin') || hasRole('superadmin');
    console.log(`[useRoles] isAdmin(): ${result}`);
    return result;
  };

  const isManager = (): boolean => {
    const result = hasRole('manager');
    console.log(`[useRoles] isManager(): ${result}`);
    return result;
  };

  const isSuperAdmin = (): boolean => {
    const result = hasRole('superadmin');
    console.log(`[useRoles] isSuperAdmin(): ${result}`);
    return result;
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isManager,
    isSuperAdmin,
  };
};