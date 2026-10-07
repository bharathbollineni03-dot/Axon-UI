import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether an element's content overflows it, so a scroll container can become a keyboard tab stop
 * only when there is something to scroll to. Without `ResizeObserver` (old browsers, jsdom) it
 * measures once and again when the window resizes.
 */
export function useIsScrollable(ref: RefObject<HTMLElement | null>): boolean {
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => {
      setScrollable(
        element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      );
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // The table inside changes size when its content does, which the container's own box may not.
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [ref]);

  return scrollable;
}
