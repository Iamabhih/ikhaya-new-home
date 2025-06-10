
import { useState, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
}

export const useRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    isBlocked: false,
  });

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Reset if outside window
    if (state.lastAttempt < windowStart) {
      setState({
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false,
      });
      return true;
    }

    // Check if blocked
    if (state.attempts >= maxAttempts) {
      return false;
    }

    return true;
  }, [state, maxAttempts, windowMs]);

  const recordAttempt = useCallback((): void => {
    const now = Date.now();
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      return {
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: newAttempts >= maxAttempts,
      };
    });
  }, [maxAttempts]);

  const reset = useCallback((): void => {
    setState({
      attempts: 0,
      lastAttempt: 0,
      isBlocked: false,
    });
  }, []);

  const getRemainingTime = useCallback((): number => {
    if (!state.isBlocked) return 0;
    const now = Date.now();
    const timeLeft = windowMs - (now - state.lastAttempt);
    return Math.max(0, Math.ceil(timeLeft / 1000));
  }, [state, windowMs]);

  return {
    canAttempt: checkRateLimit(),
    isBlocked: state.isBlocked,
    attempts: state.attempts,
    recordAttempt,
    reset,
    getRemainingTime,
  };
};
