import { useCallback, useRef, useState } from 'react';

export interface UseAutoScrollOptions {
  /** How close to the bottom, in pixels, still counts as "at the bottom". Defaults to 48. */
  threshold?: number;
}

export interface UseAutoScrollReturn<T extends HTMLElement> {
  /** Attach to the scrolling element. */
  ref: { current: T | null };
  /** Attach to its `onScroll`. */
  onScroll: () => void;
  /** Whether the view is at the bottom, so new content should be followed. */
  atBottom: boolean;
  /** Scrolls to the bottom and resumes following. Smooth, unless the user prefers less motion. */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** Call after content changed: scrolls to the bottom only while the user has not scrolled away. */
  follow: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Keeps a scrolling element pinned to its bottom while content grows (a streaming reply), and
 * lets go the moment the user scrolls up to read, so the view does not jump away from them. It
 * resumes when they scroll back to the bottom, or `scrollToBottom()` is called.
 */
export function useAutoScroll<T extends HTMLElement = HTMLDivElement>({
  threshold = 48,
}: UseAutoScrollOptions = {}): UseAutoScrollReturn<T> {
  const ref = useRef<T>(null);
  const following = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const jump = useCallback((behavior: ScrollBehavior) => {
    const element = ref.current;
    if (!element) return;
    const top = element.scrollHeight;
    if (behavior === 'smooth' && typeof element.scrollTo === 'function') {
      element.scrollTo({ top, behavior });
    } else {
      element.scrollTop = top;
    }
  }, []);

  const onScroll = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const near = distance <= threshold;
    following.current = near;
    setAtBottom((current) => (current === near ? current : near));
  }, [threshold]);

  const scrollToBottom = useCallback<UseAutoScrollReturn<T>['scrollToBottom']>(
    (behavior = 'smooth') => {
      following.current = true;
      setAtBottom(true);
      jump(prefersReducedMotion() ? 'auto' : behavior);
    },
    [jump],
  );

  const follow = useCallback(() => {
    if (following.current) jump('auto');
  }, [jump]);

  return { ref, onScroll, atBottom, scrollToBottom, follow };
}
