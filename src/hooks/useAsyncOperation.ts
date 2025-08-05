import { useState, useCallback } from 'react';
import { createLoadingDelay } from '@/utils/loadingUtils';

interface AsyncOperationOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  minimumLoadingTime?: number;
  suppressSuccessToast?: boolean;
}

export const useAsyncOperation = <T = unknown>() => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: AsyncOperationOptions<T> = {}
  ): Promise<T | null> => {
    const {
      onSuccess,
      onError,
      minimumLoadingTime = 150, // Prevent flash of loading state
      suppressSuccessToast = false
    } = options;

    try {
      setLoading(true);
      setError(null);

      // Create minimum loading time to prevent flicker
      const [result] = await Promise.all([
        operation(),
        createLoadingDelay(minimumLoadingTime)
      ]);

      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset
  };
};