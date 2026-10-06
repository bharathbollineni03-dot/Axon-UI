import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Placement,
} from '@floating-ui/react';
import { cx } from '../../utils/cx';
import { getElementRef, useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { getPortalRoot } from '../../internal/portal';

export type TooltipPlacement = Placement;

export interface TooltipProps {
  /** The tooltip's text. Keep it short; it supplements the trigger's own name, it does not replace it. */
  content: ReactNode;
  /**
   * The element the tooltip describes: one element that accepts a `ref` and DOM props. If it is
   * `disabled` it cannot be hovered or focused, so it is wrapped in a focusable `<span>` that can.
   */
  children: ReactElement;
  placement?: TooltipPlacement;
  /** Milliseconds the pointer rests on the trigger before the tooltip shows. Defaults to 300. Focus shows it at once. */
  delay?: number;
  /** Milliseconds before the tooltip hides after the pointer leaves. Defaults to 0. */
  closeDelay?: number;
  /** Never shows the tooltip. */
  disabled?: boolean;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Points a small arrow at the trigger. Defaults to `true`. */
  showArrow?: boolean;
  className?: string;
}

/**
 * A short label that appears when the trigger is hovered or keyboard-focused. It follows the
 * WCAG "content on hover" rules: the pointer can move onto the tooltip without it vanishing,
 * Esc dismisses it, and it stays until hover or focus leaves. The trigger is described by it
 * (`aria-describedby`) while it shows.
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 300,
  closeDelay = 0,
  disabled = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  showArrow = true,
  className,
}: TooltipProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [reference, setReference] = useState<HTMLElement | null>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const visible = open && !disabled;

  const { refs, floatingStyles, context } = useFloating({
    open: visible,
    onOpenChange: setOpen,
    elements: { reference },
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(showArrow ? 10 : 6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });
  const hover = useHover(context, {
    enabled: !disabled,
    move: false,
    delay: { open: delay, close: closeDelay },
    // The pointer may cross the gap and move onto the tooltip.
    handleClose: safePolygon(),
  });
  const focus = useFocus(context, { enabled: !disabled });
  const dismiss = useDismiss(context, { escapeKey: false, referencePress: true });
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  // Esc hides the tooltip. If focus is on the trigger the key is consumed, so a dialog around it
  // stays open; the next Esc then closes the dialog.
  useEffect(() => {
    if (!visible) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      if (reference?.contains(reference.ownerDocument.activeElement)) event.stopPropagation();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, reference, setOpen]);

  const triggerRef = useMergedRef<HTMLElement>(setReference, getElementRef<HTMLElement>(children));
  const childProps = children.props as { disabled?: boolean };
  // A disabled control swallows pointer events and cannot take focus, so the wrapper stands in.
  const wrapped = childProps.disabled === true;

  const trigger = wrapped ? (
    // The wrapper exists only so a disabled control can still be hovered and focused.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <span {...getReferenceProps()} ref={triggerRef} tabIndex={0} className="axon-tooltip__wrapper">
      {children}
    </span>
  ) : (
    cloneElement(children as ReactElement<Record<string, unknown>>, {
      ...getReferenceProps(children.props as Record<string, unknown>),
      ref: triggerRef,
    })
  );

  return (
    <>
      {trigger}
      {/* Wait for the trigger so the portal root (a dialog around it, say) is known. */}
      {visible && reference ? (
        <FloatingPortal root={getPortalRoot(reference)}>
          <div
            {...getFloatingProps()}
            ref={refs.setFloating}
            style={floatingStyles}
            className={cx('axon-tooltip', className)}
          >
            {content}
            {showArrow ? (
              <FloatingArrow
                ref={arrowRef}
                context={context}
                width={10}
                height={5}
                className="axon-tooltip__arrow"
                fill="var(--axon-tooltip-bg)"
              />
            ) : null}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}
