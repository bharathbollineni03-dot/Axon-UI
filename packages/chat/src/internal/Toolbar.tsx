import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { useMergedRef } from './mergeRefs';

/**
 * A WAI-ARIA toolbar over the buttons inside it: one tab stop for the whole group, and the arrow
 * keys, Home and End move between the buttons. The buttons keep their own `tabIndex` out of it;
 * the toolbar manages it so buttons can come and go.
 */
export const Toolbar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Toolbar(
  { onKeyDown, onFocus, children, ...rest },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef<HTMLDivElement>(ref, root);
  const active = useRef<HTMLElement | null>(null);

  const buttons = useCallback(
    () =>
      Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
    [],
  );

  const setTabStop = useCallback(
    (target?: HTMLElement | null) => {
      const list = buttons();
      const stop = target && list.includes(target as HTMLButtonElement) ? target : list[0];
      active.current = stop ?? null;
      for (const button of list) button.tabIndex = button === stop ? 0 : -1;
    },
    [buttons],
  );

  // Buttons come and go with the message's state, so settle the tab stop after every render.
  useLayoutEffect(() => {
    setTabStop(active.current);
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const list = buttons();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % list.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + list.length) % list.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else return;
    event.preventDefault();
    setTabStop(list[next]);
    list[next]?.focus();
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    setTabStop(event.target as HTMLElement);
  };

  return (
    <div {...rest} ref={mergedRef} role="toolbar" onKeyDown={handleKeyDown} onFocus={handleFocus}>
      {children}
    </div>
  );
});
