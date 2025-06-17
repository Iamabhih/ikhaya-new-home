
import { useState, useEffect, useMemo } from 'react';

interface UseVirtualizerOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualizer({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5
}: UseVirtualizerOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const totalHeight = itemCount * itemHeight;

  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
      });
    }
    return items;
  }, [visibleRange.startIndex, visibleRange.endIndex, itemHeight]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    visibleRange,
  };
}
