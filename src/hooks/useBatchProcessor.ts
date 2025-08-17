import { useState, useCallback, useRef } from 'react';

interface BatchItem<T> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

interface BatchProcessorOptions {
  batchSize: number;
  delayBetweenBatches: number;
  delayBetweenItems: number;
  maxRetries: number;
  onBatchStart?: (batchIndex: number, items: string[]) => void;
  onBatchComplete?: (batchIndex: number, results: any[]) => void;
  onItemStart?: (itemId: string) => void;
  onItemComplete?: (itemId: string, result: any) => void;
  onItemError?: (itemId: string, error: Error) => void;
}

export function useBatchProcessor<T>(
  processor: (item: T, onProgress?: (progress: number) => void) => Promise<any>,
  options: BatchProcessorOptions
) {
  const [items, setItems] = useState<Map<string, BatchItem<T>>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addItems = useCallback((newItems: Array<{ id: string; data: T }>) => {
    setItems(prev => {
      const updated = new Map(prev);
      newItems.forEach(({ id, data }) => {
        updated.set(id, {
          id,
          data,
          status: 'pending',
          progress: 0,
        });
      });
      return updated;
    });
  }, []);

  const updateItemStatus = useCallback((
    itemId: string,
    updates: Partial<Pick<BatchItem<T>, 'status' | 'progress' | 'error' | 'result'>>
  ) => {
    setItems(prev => {
      const updated = new Map(prev);
      const item = updated.get(itemId);
      if (item) {
        updated.set(itemId, { ...item, ...updates });
      }
      return updated;
    });
  }, []);

  const processItem = async (item: BatchItem<T>): Promise<any> => {
    try {
      updateItemStatus(item.id, { status: 'processing', progress: 0 });
      options.onItemStart?.(item.id);

      const result = await processor(item.data, (progress) => {
        updateItemStatus(item.id, { progress });
      });

      updateItemStatus(item.id, { 
        status: 'completed', 
        progress: 100, 
        result 
      });
      
      options.onItemComplete?.(item.id, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateItemStatus(item.id, { 
        status: 'error', 
        progress: 0, 
        error: errorMessage 
      });
      
      options.onItemError?.(item.id, error as Error);
      throw error;
    }
  };

  const processBatch = async (batchItems: BatchItem<T>[]): Promise<any[]> => {
    const batchIds = batchItems.map(item => item.id);
    options.onBatchStart?.(currentBatch, batchIds);

    const results = [];
    
    for (const item of batchItems) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Processing aborted');
      }

      try {
        const result = await processItem(item);
        results.push(result);
        
        // Delay between items within a batch
        if (options.delayBetweenItems > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenItems));
        }
      } catch (error) {
        // Continue processing other items even if one fails
        results.push(null);
      }
    }

    options.onBatchComplete?.(currentBatch, results);
    return results;
  };

  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    const pendingItems = Array.from(items.values()).filter(
      item => item.status === 'pending' || item.status === 'error'
    );

    if (pendingItems.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    const batches = [];
    for (let i = 0; i < pendingItems.length; i += options.batchSize) {
      batches.push(pendingItems.slice(i, i + options.batchSize));
    }

    setTotalBatches(batches.length);
    setCurrentBatch(0);

    try {
      for (let i = 0; i < batches.length; i++) {
        if (abortControllerRef.current?.signal.aborted) break;

        setCurrentBatch(i + 1);
        await processBatch(batches[i]);

        // Delay between batches
        if (i < batches.length - 1 && options.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
      }
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      setIsProcessing(false);
      setCurrentBatch(0);
      abortControllerRef.current = null;
    }
  }, [items, isProcessing, options, currentBatch]);

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearItems = useCallback(() => {
    setItems(new Map());
    setCurrentBatch(0);
    setTotalBatches(0);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => {
      const updated = new Map(prev);
      updated.delete(itemId);
      return updated;
    });
  }, []);

  const retryFailedItems = useCallback(() => {
    setItems(prev => {
      const updated = new Map(prev);
      updated.forEach((item, id) => {
        if (item.status === 'error') {
          updated.set(id, { ...item, status: 'pending', progress: 0, error: undefined });
        }
      });
      return updated;
    });
  }, []);

  const getStats = useCallback(() => {
    const itemsArray = Array.from(items.values());
    return {
      total: itemsArray.length,
      pending: itemsArray.filter(item => item.status === 'pending').length,
      processing: itemsArray.filter(item => item.status === 'processing').length,
      completed: itemsArray.filter(item => item.status === 'completed').length,
      failed: itemsArray.filter(item => item.status === 'error').length,
      progress: itemsArray.length > 0 
        ? Math.round((itemsArray.filter(item => item.status === 'completed').length / itemsArray.length) * 100)
        : 0
    };
  }, [items]);

  return {
    items: Array.from(items.values()),
    isProcessing,
    currentBatch,
    totalBatches,
    addItems,
    startProcessing,
    stopProcessing,
    clearItems,
    removeItem,
    retryFailedItems,
    getStats: getStats(),
  };
}