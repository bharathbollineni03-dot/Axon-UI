import type { ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { getPortalRoot } from '../portal';

export interface PopupDialogProps {
  open: boolean;
  /** The element the dialog is anchored to. Presses on it do not count as "outside". */
  reference: HTMLElement | null;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  size?: AxonSize;
  color?: AxonColor;
  className?: string;
  children: ReactNode;
}

/**
 * A non-listbox popup (calendar, time columns, ...): a non-modal `dialog` that closes
 * on Escape, an outside press or when focus leaves it, and returns focus to the field. Content decides what
 * gets focus first (the dialog itself does not steal it).
 */
export function PopupDialog({
  open,
  reference,
  onClose,
  label,
  size = 'md',
  color = 'primary',
  className,
  children,
}: PopupDialogProps) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    elements: { reference },
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const dismiss = useDismiss(context, {
    outsidePress: (event) => !(reference && reference.contains(event.target as Node)),
  });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  if (!open) return null;

  return (
    <FloatingPortal root={getPortalRoot(reference)}>
      <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
        <div
          {...getFloatingProps({ 'aria-label': label })}
          ref={refs.setFloating}
          style={floatingStyles}
          className={cx('axon-popup', `axon-popup--${size}`, `axon-popup--${color}`, className)}
        >
          {children}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
