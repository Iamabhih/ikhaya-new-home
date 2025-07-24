import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RateLimiter, sanitizeEmail, logSecurityEvent } from '@/utils/security';
import { toast } from 'sonner';

const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

interface AuthAttempt {
  email: string;
  success: boolean;
  timestamp: number;
  userAgent: string;
  ip?: string;
}

export const useSecureAuth = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState<AuthAttempt[]>([]);

  const validateAuthInput = (email: string, password: string): string[] => {
    const errors: string[] = [];
    
    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (password && password.length > 128) {
      errors.push('Password is too long');
    }
    
    return errors;
  };

  const recordAuthAttempt = (email: string, success: boolean) => {
    const attempt: AuthAttempt = {
      email: sanitizeEmail(email),
      success,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    
    setAttempts(prev => [...prev.slice(-9), attempt]); // Keep last 10 attempts
    
    if (!success) {
      logSecurityEvent(
        'failed_login_attempt',
        `Failed login attempt for email: ${sanitizeEmail(email)}`,
        'medium',
        { email: sanitizeEmail(email), userAgent: navigator.userAgent }
      );
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const sanitizedEmail = sanitizeEmail(email);
    
    // Validate input
    const validationErrors = validateAuthInput(sanitizedEmail, password);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return { error: new Error(validationErrors[0]) };
    }
    
    // Check rate limiting
    if (!authRateLimiter.isAllowed(sanitizedEmail)) {
      const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(sanitizedEmail) / 1000 / 60);
      const errorMsg = `Too many failed attempts. Please try again in ${remainingTime} minutes.`;
      
      logSecurityEvent(
        'rate_limit_exceeded',
        `Rate limit exceeded for email: ${sanitizedEmail}`,
        'high',
        { email: sanitizedEmail, remainingTime }
      );
      
      toast.error(errorMsg);
      return { error: new Error(errorMsg) };
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });
      
      if (error) {
        recordAuthAttempt(sanitizedEmail, false);
        
        // Log specific error types
        if (error.message.includes('Invalid login credentials')) {
          logSecurityEvent(
            'invalid_credentials',
            `Invalid credentials for email: ${sanitizedEmail}`,
            'medium',
            { email: sanitizedEmail }
          );
        }
        
        throw error;
      }
      
      recordAuthAttempt(sanitizedEmail, true);
      authRateLimiter.reset(sanitizedEmail); // Reset rate limit on successful login
      
      logSecurityEvent(
        'successful_login',
        `User logged in successfully: ${sanitizedEmail}`,
        'low',
        { email: sanitizedEmail, userId: data.user?.id }
      );
      
      return { data, error: null };
      
    } catch (error) {
      recordAuthAttempt(sanitizedEmail, false);
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, additionalData?: any) => {
    const sanitizedEmail = sanitizeEmail(email);
    
    // Validate input
    const validationErrors = validateAuthInput(sanitizedEmail, password);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return { error: new Error(validationErrors[0]) };
    }
    
    // Check rate limiting for signups too
    if (!authRateLimiter.isAllowed(`signup_${sanitizedEmail}`)) {
      const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(`signup_${sanitizedEmail}`) / 1000 / 60);
      const errorMsg = `Too many signup attempts. Please try again in ${remainingTime} minutes.`;
      
      logSecurityEvent(
        'signup_rate_limit_exceeded',
        `Signup rate limit exceeded for email: ${sanitizedEmail}`,
        'high',
        { email: sanitizedEmail }
      );
      
      toast.error(errorMsg);
      return { error: new Error(errorMsg) };
    }
    
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: additionalData
        }
      });
      
      if (error) {
        logSecurityEvent(
          'signup_failed',
          `Signup failed for email: ${sanitizedEmail}`,
          'medium',
          { email: sanitizedEmail, error: error.message }
        );
        throw error;
      }
      
      logSecurityEvent(
        'user_signup',
        `New user signed up: ${sanitizedEmail}`,
        'low',
        { email: sanitizedEmail, userId: data.user?.id }
      );
      
      return { data, error: null };
      
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      logSecurityEvent(
        'user_logout',
        `User logged out`,
        'low',
        { userId: user?.id }
      );
      
      return { error: null };
      
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const resetPassword = useCallback(async (email: string) => {
    const sanitizedEmail = sanitizeEmail(email);
    
    if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      toast.error('Please enter a valid email address');
      return { error: new Error('Invalid email address') };
    }
    
    // Rate limit password reset requests
    if (!authRateLimiter.isAllowed(`reset_${sanitizedEmail}`)) {
      const remainingTime = Math.ceil(authRateLimiter.getRemainingTime(`reset_${sanitizedEmail}`) / 1000 / 60);
      const errorMsg = `Too many password reset attempts. Please try again in ${remainingTime} minutes.`;
      
      logSecurityEvent(
        'password_reset_rate_limit',
        `Password reset rate limit exceeded for email: ${sanitizedEmail}`,
        'medium',
        { email: sanitizedEmail }
      );
      
      toast.error(errorMsg);
      return { error: new Error(errorMsg) };
    }
    
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/auth?tab=reset`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: redirectUrl
      });
      
      if (error) throw error;
      
      logSecurityEvent(
        'password_reset_requested',
        `Password reset requested for email: ${sanitizedEmail}`,
        'low',
        { email: sanitizedEmail }
      );
      
      return { error: null };
      
    } catch (error) {
      logSecurityEvent(
        'password_reset_failed',
        `Password reset failed for email: ${sanitizedEmail}`,
        'medium',
        { email: sanitizedEmail, error: (error as Error).message }
      );
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    isLoading,
    attempts,
    user
  };
};