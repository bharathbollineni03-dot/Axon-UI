import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';

let locks = 0;
let release: (() => void) | undefined;

function lock() {
  const html = document.documentElement;
  const body = document.body;
  const previous = {
    htmlOverflow: html.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
  };
  // Hiding the scrollbar widens the page; padding by the same amount keeps it from shifting.
  const scrollbar = html.clientWidth > 0 ? window.innerWidth - html.clientWidth : 0;
  html.style.overflow = 'hidden';
  if (scrollbar > 0) {
    body.style.paddingRight = `calc(${window.getComputedStyle(body).paddingRight} + ${scrollbar}px)`;
  }
  release = () => {
    html.style.overflow = previous.htmlOverflow;
    body.style.paddingRight = previous.bodyPaddingRight;
  };
}

/**
 * Stops the page behind an overlay from scrolling while `enabled`. Several overlays can ask at
 * once; the page scrolls again when the last one lets go, with its styles put back as they were.
 */
export function useScrollLock(enabled: boolean) {
  useIsomorphicLayoutEffect(() => {
    if (!enabled) return undefined;
    locks += 1;
    if (locks === 1) lock();
    return () => {
      locks -= 1;
      if (locks === 0) {
        release?.();
        release = undefined;
      }
    };
  }, [enabled]);
}
