import {
  cloneElement,
  forwardRef,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  type Placement,
} from '@floating-ui/react';
import { cx } from '../../utils/cx';
import { getElementRef, useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { getPortalRoot } from '../../internal/portal';

export type PopoverPlacement = Placement;

interface PopoverBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /**
   * The element that opens the popover, usually a `Button`. It must accept a `ref` and `id` and the
   * usual DOM props; it is cloned with the ARIA attributes and handlers it needs.
   */
  trigger: ReactElement;
  /** Whether the popover is open. Controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: PopoverPlacement;
  /** Gap between the trigger and the popover, in pixels. Defaults to 8. */
  offset?: number;
  /** Points a small arrow at the trigger. Defaults to `true`. */
  showArrow?: boolean;
  closeOnEscape?: boolean;
  /** Closes on a press outside, and when focus leaves. Defaults to `true`. */
  closeOnOutsidePress?: boolean;
  /** The content, or a function that receives `close` for a button inside the popover. */
  children?: ReactNode | ((api: { close: () => void }) => ReactNode);
}

/** A popover needs a name: a `title`, or an `aria-label` / `aria-labelledby`. */
type PopoverLabel =
  | { title: ReactNode }
  | { title?: undefined; 'aria-label': string }
  | { title?: undefined; 'aria-labelledby': string };

export type PopoverProps = PopoverBaseProps & PopoverLabel;

type TriggerProps = {
  id?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * A small non-modal dialog attached to a trigger, for rich content or a short form. Unlike a
 * menu it can hold anything; unlike a tooltip it opens on press and stays until dismissed. Focus
 * moves into it when it opens and back to the trigger when it closes; Esc, an outside press or
 * tabbing away close it.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    trigger,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    placement = 'bottom',
    offset: gap = 8,
    showArrow = true,
    closeOnEscape = true,
    closeOnOutsidePress = true,
    title,
    id,
    className,
    style,
    children,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [reference, setReference] = useState<HTMLElement | null>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const popoverId = useId(id, 'axon-popover');
  const titleId = `${popoverId}-title`;

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    elements: { reference },
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(gap + (showArrow ? 4 : 0)),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });
  // Escape is handled below, on the elements themselves, so a dialog around the popover does not
  // close together with it.
  const dismiss = useDismiss(context, {
    escapeKey: false,
    outsidePress: closeOnOutsidePress
      ? (event) => !reference?.contains(event.target as Node)
      : false,
  });
  const { getFloatingProps } = useInteractions([dismiss]);

  const triggerProps = trigger.props as TriggerProps;
  const triggerId = triggerProps.id ?? `${popoverId}-trigger`;
  const triggerRef = useMergedRef<HTMLElement>(setReference, getElementRef<HTMLElement>(trigger));
  const floatingRef = useMergedRef<HTMLDivElement>(ref, refs.setFloating);

  const closeOnEscapeKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !closeOnEscape || !open) return;
    event.stopPropagation();
    setOpen(false);
  };

  const anchor = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    id: triggerId,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? popoverId : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(event);
      if (!event.defaultPrevented) setOpen(!open);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      triggerProps.onKeyDown?.(event);
      if (!event.defaultPrevented) closeOnEscapeKey(event);
    },
  });

  return (
    <>
      {anchor}
      {/* Wait for the trigger so the portal root (a dialog around it, say) is known. */}
      {open && reference ? (
        // No focus guards: they are invisible tab stops that axe reports as focusable aria-hidden
        // content. Tab leaving the popover closes it and focus goes back to the trigger instead.
        <FloatingPortal root={getPortalRoot(reference)} preserveTabOrder={false}>
          {/* Non-modal: the page stays reachable, but Tab leaving the popover closes it. */}
          <FloatingFocusManager
            context={context}
            modal={false}
            returnFocus
            guards={false}
            closeOnFocusOut={closeOnOutsidePress}
          >
            {/* The Escape handler only mirrors the key the focused content already receives. */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
              {...getFloatingProps({
                ...rest,
                id: popoverId,
                role: 'dialog',
                tabIndex: -1,
                'aria-label': title ? undefined : ariaLabel,
                'aria-labelledby': title ? titleId : (ariaLabelledBy ?? undefined),
                onKeyDown: closeOnEscapeKey,
              })}
              ref={floatingRef}
              style={{ ...floatingStyles, ...style }}
              className={cx('axon-popover', className)}
            >
              {title ? (
                <div id={titleId} className="axon-popover__title">
                  {title}
                </div>
              ) : null}
              <div className="axon-popover__content">
                {typeof children === 'function'
                  ? children({ close: () => setOpen(false) })
                  : children}
              </div>
              {showArrow ? (
                <FloatingArrow
                  ref={arrowRef}
                  context={context}
                  width={12}
                  height={6}
                  className="axon-popover__arrow"
                  fill="var(--axon-color-surface-raised)"
                  stroke="var(--axon-color-border)"
                  strokeWidth={1}
                />
              ) : null}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
});
