import {
  cloneElement,
  forwardRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { getElementRef, useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useId } from '../../hooks/useId';
import { Menu, type MenuProps } from '../Menu/Menu';

export interface DropdownMenuProps extends Omit<
  MenuProps,
  'open' | 'anchor' | 'onClose' | 'initialFocus'
> {
  /**
   * The element that opens the menu, usually a `Button`. It must accept a `ref` and `id` and the
   * usual DOM props; it is cloned with the ARIA attributes and handlers it needs.
   */
  trigger: ReactElement;
  /** Whether the menu is open. Controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TriggerProps = {
  id?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * A button that opens a menu of actions, following the WAI-ARIA menu button pattern: Enter, Space
 * and ↓ open it on the first item, ↑ on the last; arrows, Home/End and typing move between items;
 * Esc closes it and returns focus to the button.
 */
export const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(function DropdownMenu(
  {
    trigger,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    placement,
    children,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [initialFocus, setInitialFocus] = useState<'first' | 'last' | 'panel'>('panel');
  const menuId = useId(id, 'axon-dropdown-menu');
  const generatedTriggerId = useId(undefined, 'axon-menu-trigger');
  const triggerRef = useMergedRef<HTMLElement>(
    setTriggerElement,
    getElementRef<HTMLElement>(trigger),
  );

  const triggerProps = trigger.props as TriggerProps;
  const triggerId = triggerProps.id ?? generatedTriggerId;

  const show = (focus: 'first' | 'last' | 'panel') => {
    setInitialFocus(focus);
    setOpen(true);
  };

  const anchor = cloneElement(trigger as ReactElement<Record<string, unknown>>, {
    ref: triggerRef,
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(event);
      if (event.defaultPrevented) return;
      // Enter and Space reach here as a click with no pointer (`detail` is 0): start on the
      // first item. A mouse click leaves focus on the menu so the arrow keys work.
      if (open) setOpen(false);
      else show(event.detail === 0 ? 'first' : 'panel');
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      triggerProps.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        show(event.key === 'ArrowDown' ? 'first' : 'last');
      }
    },
  });

  return (
    <>
      {anchor}
      <Menu
        {...rest}
        ref={ref}
        id={menuId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? ariaLabelledBy : (ariaLabelledBy ?? triggerId)}
        // Wait for the trigger so the menu renders in the right portal root (e.g. inside a dialog).
        open={open && triggerElement !== null}
        anchor={triggerElement}
        placement={placement}
        initialFocus={initialFocus}
        onClose={(reason) => {
          setOpen(false);
          // An outside press already put focus where the user clicked.
          if (reason !== 'outside') triggerElement?.focus();
        }}
      >
        {children}
      </Menu>
    </>
  );
});
