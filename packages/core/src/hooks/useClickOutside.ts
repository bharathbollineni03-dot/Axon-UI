import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls `handler` when a pointer press (or a touch) lands outside every given element.
 * Listens on the document, only while `enabled`. Presses on elements in `ignore` do not count.
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: (event: PointerEvent | MouseEvent | TouchEvent) => void,
  {
    enabled = true,
    ignore = [],
  }: { enabled?: boolean; ignore?: RefObject<HTMLElement | null>[] } = {},
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const refList = Array.isArray(refs) ? refs : [refs];
  const refsRef = useRef(refList);
  refsRef.current = refList;
  const ignoreRef = useRef(ignore);
  ignoreRef.current = ignore;

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inside = [...refsRef.current, ...ignoreRef.current].some((ref) =>
        ref.current?.contains(target),
      );
      if (!inside) handlerRef.current(event);
    };
    // pointerdown covers mouse, touch and pen; touchstart/mousedown cover older browsers.
    const events = ['pointerdown', 'mousedown', 'touchstart'] as const;
    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;
    const active = supportsPointer ? (['pointerdown'] as const) : events.slice(1);
    active.forEach((name) => document.addEventListener(name, listener));
    return () => active.forEach((name) => document.removeEventListener(name, listener));
  }, [enabled]);
}
