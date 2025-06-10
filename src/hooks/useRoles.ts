
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'customer' | 'admin' | 'superadmin';

export const useRoles = (user: User | null) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
        } else {
          setRoles(data?.map(r => r.role as AppRole) || []);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
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
