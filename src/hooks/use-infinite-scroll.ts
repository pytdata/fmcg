import { useCallback, useEffect, useRef, useState } from 'react';

interface Page<T> { items: T[]; total: number }

interface UseInfiniteScrollOptions<T> {
  /** Fetch one page of results (1-indexed). */
  fetchPage: (page: number) => Promise<Page<T>>;
  /** Changing this value resets back to page 1 and refetches (e.g. a filter changed). */
  resetKey?: string | number | boolean;
}

/**
 * Accumulates pages of a list as the user scrolls near the bottom (attach
 * `sentinelRef` to an empty div after the list), while also exposing `page`
 * and `goToPage` so callers can offer direct page-number navigation that
 * jumps straight to a page instead of accumulating.
 */
export function useInfiniteScroll<T>({ fetchPage, resetKey }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);

  const hasMore = items.length < total;
  const loadingRef = useRef(false);

  const load = useCallback(async (targetPage: number, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const { items: newItems, total: newTotal } = await fetchPage(targetPage);
      setTotal(newTotal);
      setItems(prev => (replace ? newItems : [...prev, ...newItems]));
      setPage(targetPage);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setInitialLoading(true);
    load(1, true);
    // Only resetKey should trigger a fresh page-1 load — `load` itself changes
    // whenever fetchPage's identity changes, which would otherwise re-fire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Keep the latest state in a ref so the observer callback (registered once
  // per sentinel element) never closes over a stale `page`/`hasMore`/`loading`.
  const latest = useRef({ hasMore, loading, page });
  latest.current = { hasMore, loading, page };

  useEffect(() => {
    if (!sentinelNode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore: more, loading: busy, page: p } = latest.current;
        if (entries[0].isIntersecting && more && !busy) load(p + 1, false);
      },
      { rootMargin: '600px' },
    );
    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [sentinelNode, load]);

  /** Jump directly to a specific page, replacing the accumulated list. */
  const goToPage = useCallback((targetPage: number) => load(targetPage, true), [load]);

  return {
    items, total, page, loading, initialLoading, hasMore,
    sentinelRef: setSentinelNode, goToPage,
    reload: () => load(1, true),
  };
}
