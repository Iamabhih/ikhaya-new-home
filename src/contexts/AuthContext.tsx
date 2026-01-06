import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/appLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state change:', { 
          event, 
          hasSession: !!session, 
          userId: session?.user?.id, 
          userEmail: session?.user?.email 
        });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          logger.auth.login(session?.user?.email || 'unknown', true, { userId: session?.user?.id });
          toast.success("Welcome back!");
        } else if (event === 'SIGNED_OUT') {
          logger.auth.logout(session?.user?.email);
          toast.success("Signed out successfully");
        } else if (event === 'TOKEN_REFRESHED') {
          logger.info('auth', 'Session token refreshed', { userId: session?.user?.id });
        }
      }
    );

    // Check for existing session
    const getInitialSession = async () => {
      try {
        console.log('[AuthContext] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
        } else {
          console.log('[AuthContext] Initial session loaded:', { 
            hasSession: !!session, 
            userId: session?.user?.id, 
            userEmail: session?.user?.email 
          });
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('[AuthContext] Error in getSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If session doesn't exist, that's fine - user is already signed out
        if (error.message?.includes('session_not_found') || error.message?.includes('Session from session_id claim in JWT does not exist')) {
          console.log("Session already expired or doesn't exist");
          // Clear local state manually since session is already gone
          setSession(null);
          setUser(null);
          toast.success("Signed out successfully");
          return;
        }
        toast.error("Error signing out");
        console.error("Error signing out:", error);
      }
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Clear local state even if server call fails
      setSession(null);
      setUser(null);
      toast.success("Signed out successfully");
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};