import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Elements inside `container` that Tab can reach, in DOM order. */
export function getTabbable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.closest('[hidden], [inert]'),
  );
}

export interface UseFocusTrapOptions {
  /** Trap focus only while true. */
  enabled?: boolean;
  /** Move focus into the container when the trap turns on. Defaults to `true`. */
  autoFocus?: boolean;
  /** Return focus to the element that had it before, when the trap turns off. Defaults to `true`. */
  restoreFocus?: boolean;
  /** Element to focus first. Defaults to the first tabbable element, or the container itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Suspends the trap without releasing it (no focus is moved or restored), for when another
   * trap, such as a dialog opened from this one, is on top.
   */
  paused?: boolean;
}

/**
 * Keeps Tab and Shift+Tab inside `containerRef` while `enabled`, and moves focus in and back out.
 * The container should have `tabIndex={-1}` so it can hold focus when it has nothing tabbable.
 * Dialog-like components pair this with an Escape handler.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    autoFocus = true,
    restoreFocus = true,
    initialFocusRef,
    paused = false,
  }: UseFocusTrapOptions = {},
) {
  const initialRef = useRef(initialFocusRef);
  initialRef.current = initialFocusRef;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (autoFocus && !container.contains(document.activeElement)) {
      const target = initialRef.current?.current ?? getTabbable(container)[0] ?? container;
      target.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || pausedRef.current) return;
      const tabbable = getTabbable(container);
      if (tabbable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = tabbable[0]!;
      const last = tabbable[tabbable.length - 1]!;
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || active === container || !container.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    // Catches focus that escapes by other means (a click, a script) and pulls it back in.
    const handleFocusIn = (event: FocusEvent) => {
      if (!pausedRef.current && !container.contains(event.target as Node)) {
        (getTabbable(container)[0] ?? container).focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      if (restoreFocus && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [containerRef, enabled, autoFocus, restoreFocus]);
}
