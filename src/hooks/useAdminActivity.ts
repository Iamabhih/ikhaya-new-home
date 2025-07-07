
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AdminActivity {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export const useAdminActivity = () => {
  const { user } = useAuth();

  const logActivity = useMutation({
    mutationFn: async (activity: AdminActivity) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: 'admin_action',
          event_name: activity.action,
          metadata: {
            resource_type: activity.resource_type,
            resource_id: activity.resource_id,
            details: activity.details,
          },
        });

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Failed to log admin activity:', error);
    },
  });

  return {
    logActivity: logActivity.mutate,
    isLogging: logActivity.isPending,
  };
};
