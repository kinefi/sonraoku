import { useMemo } from 'react';

/**
 * Flattens infinite query pages and ensures items are unique by ID.
 * Prevents duplicate key warnings in lists when data shifts between pages.
 */
export function useDeduplicatedInfiniteData<T extends { id: string | number }>(
  pages: T[][] | undefined
): T[] {
  return useMemo(() => {
    if (!pages) return [];
    const seen = new Set();
    return pages.flat().filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [pages]);
}