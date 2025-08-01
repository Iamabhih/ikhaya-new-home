
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'customer' | 'admin' | 'superadmin';

export const useRoles = (user: User | null) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.id) {
        setRoles([]);
        setLoading(false);
        setLastFetched(null);
        return;
      }

      // Prevent multiple calls for the same user within a short time frame
      if (lastFetched === user.id && roles.length > 0) {
        setLoading(false);
        return;
      }

      // Prevent multiple simultaneous calls
      if (loading && lastFetched === user.id) return;

      try {
        console.log('[useRoles] Fetching roles for user:', user.id);
        setLoading(true);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
        } else {
          console.log('[useRoles] Roles fetched:', data);
          setRoles(data?.map(r => r.role as AppRole) || []);
          setLastFetched(user.id);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.id]); // Only depend on user.id, not the entire user object

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
