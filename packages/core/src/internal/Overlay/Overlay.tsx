import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { cx } from '../../utils/cx';
import { useMergedRef } from '../../utils/mergeRefs';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Portal } from '../../components/Portal';
import { isTopmostOverlay, useOverlayStack } from './overlayStack';
import { useScrollLock } from './scrollLock';

export type OverlayDismissReason = 'escape' | 'backdrop';

export interface OverlayProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'role' | 'className' | 'children'
> {
  open: boolean;
  /** The user asked to dismiss the overlay: Esc, or a press on the dimmed backdrop. */
  onDismiss: (reason: OverlayDismissReason) => void;
  /** `alertdialog` is for interruptions that need an answer, such as confirmations. */
  role?: 'dialog' | 'alertdialog';
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  /** Element focused when the overlay opens. Defaults to the surface itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where to render. Defaults to the closest `.axon-root`, or `<body>`. */
  container?: HTMLElement | null;
  /** Class names for the full-screen layer, the scrolling area, and the surface (the dialog). */
  rootClassName?: string;
  containerClassName?: string;
  surfaceClassName?: string;
  children?: ReactNode;
}

type LayerProps = Omit<OverlayProps, 'open' | 'container'>;

/** The overlay while it is open. Mounted only then, so its effects (scroll lock, focus) track `open`. */
const OverlayLayer = forwardRef<HTMLDivElement, LayerProps>(function OverlayLayer(
  {
    onDismiss,
    role = 'dialog',
    closeOnEscape = true,
    closeOnBackdrop = true,
    initialFocusRef,
    rootClassName,
    containerClassName,
    surfaceClassName,
    children,
    ...surfaceProps
  },
  ref,
) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const surfaceRef = useMergedRef<HTMLDivElement>(ref, setSurface);
  const { id, topmost } = useOverlayStack();
  useScrollLock(true);

  // The trap holds the whole layer, not just the dialog, so popups portaled into it count as inside.
  const rootRef = useMemo(() => ({ current: root }), [root]);
  const surfaceFocusRef = useMemo(() => ({ current: surface }), [surface]);
  useFocusTrap(rootRef, {
    enabled: root !== null,
    paused: !topmost,
    initialFocusRef: initialFocusRef ?? surfaceFocusRef,
  });

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    if (!closeOnEscape) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      // A menu, popover or select inside the overlay handles its own Escape first.
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (isTopmostOverlay(id)) onDismissRef.current('escape');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, id]);

  // Dismiss only when the press both started and ended on the backdrop, so selecting text in the
  // dialog and releasing outside it does not close it.
  const pressedBackdrop = useRef(false);
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    pressedBackdrop.current = event.target === event.currentTarget;
    // Keeps focus where it is instead of dropping it to the page behind.
    if (pressedBackdrop.current) event.preventDefault();
  };
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const onBackdrop = pressedBackdrop.current && event.target === event.currentTarget;
    pressedBackdrop.current = false;
    if (onBackdrop && closeOnBackdrop) onDismissRef.current('backdrop');
  };

  return (
    <div ref={setRoot} data-axon-overlay="" className={cx('axon-overlay', rootClassName)}>
      {/* The backdrop press is a pointer shortcut; Esc and the close button are the keyboard routes. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={cx('axon-overlay__container', containerClassName)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <div
          {...surfaceProps}
          ref={surfaceRef}
          role={role}
          aria-modal="true"
          tabIndex={-1}
          className={cx('axon-overlay__surface', surfaceClassName)}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

/**
 * The machinery shared by `Modal` and `Drawer`: a full-screen layer in a portal with a dimmed
 * backdrop and one dialog surface. Locks page scroll, traps and restores focus, closes on Esc
 * (the topmost overlay only) and on a backdrop press, and keeps popups opened from inside it
 * stacked above it.
 */
export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(function Overlay(
  { open, container, ...rest },
  ref,
) {
  if (!open) return null;
  return (
    <Portal container={container}>
      <OverlayLayer {...rest} ref={ref} />
    </Portal>
  );
});
