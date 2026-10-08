import { useCallback, useEffect, useRef, type RefObject } from 'react';

interface Options {
  scrollRef: RefObject<HTMLElement | null>;
  /** Whether the grid is in infinite-scroll mode at all. */
  enabled: boolean;
  /** Whether there is more to fetch. */
  hasMore: boolean;
  /** Whether a fetch is already under way. */
  loading: boolean;
  onLoadMore: (() => void) | undefined;
  /** How many rows there are now; a request is made at most once for each count. */
  itemCount: number;
  /** How close to the end, in pixels, the scroll position has to be to ask. */
  thresholdPx: number;
}

/**
 * Asks for more rows when the reader scrolls near the end of what there is, and also when what
 * there is does not fill the scroll area (so a short first page does not strand the reader).
 */
export function useInfiniteScroll({
  scrollRef,
  enabled,
  hasMore,
  loading,
  onLoadMore,
  itemCount,
  thresholdPx,
}: Options) {
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const requestedAt = useRef(-1);

  const check = useCallback(() => {
    const element = scrollRef.current;
    if (!element || !enabled || !hasMore || loading || requestedAt.current === itemCount) return;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= thresholdPx) {
      requestedAt.current = itemCount;
      onLoadMoreRef.current?.();
    }
  }, [scrollRef, enabled, hasMore, loading, itemCount, thresholdPx]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !enabled) return undefined;
    element.addEventListener('scroll', check, { passive: true });
    return () => element.removeEventListener('scroll', check);
  }, [scrollRef, enabled, check]);

  // After every render: new rows may still leave the end in view.
  useEffect(check);
}
