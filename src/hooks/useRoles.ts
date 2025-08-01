
import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'customer' | 'admin' | 'superadmin';

export const useRoles = (user: User | null) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) {
        setRoles([]);
        setLoading(false);
        lastUserIdRef.current = null;
        return;
      }

      // Prevent multiple calls for the same user and avoid concurrent calls
      if (lastUserIdRef.current === user.id || fetchingRef.current) {
        setLoading(false);
        return;
      }

      try {
        console.log('[useRoles] Fetching roles for user:', user.id);
        setLoading(true);
        fetchingRef.current = true;
        lastUserIdRef.current = user.id;
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
          lastUserIdRef.current = null; // Reset on error to allow retry
        } else {
          console.log('[useRoles] Roles fetched:', data);
          setRoles(data?.map(r => r.role as AppRole) || []);
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
    return roles.includes(role);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('superadmin');
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('superadmin');
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isSuperAdmin,
  };
};
