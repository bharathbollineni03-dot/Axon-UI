import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches, e.g. `useMediaQuery('(min-width: 768px)')`.
 * Returns `defaultValue` (false) on the server and during hydration, then the real value, so server
 * and client markup agree. Prefer CSS (or the responsive props on `Stack`/`Grid`) when you can.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : defaultValue;

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}
