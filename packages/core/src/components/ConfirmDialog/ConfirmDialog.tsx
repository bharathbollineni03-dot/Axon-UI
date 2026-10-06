import { forwardRef, useRef, useState, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { Button } from '../Button';
import { Modal, type ModalSize } from '../Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  /** The question or consequence, read out when the dialog opens. */
  description?: ReactNode;
  /** Extra content under the description, e.g. the item being deleted. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * The confirm button's color. Use `danger` for destructive actions: it also moves the initial
   * focus to Cancel, so a stray Enter does not delete anything.
   */
  color?: AxonColor;
  /**
   * Called when the user confirms. If it returns a promise, the dialog shows a busy state until it
   * settles; close the dialog yourself when it succeeds. If it rejects, the dialog goes back to
   * normal and the error is logged to the console.
   */
  onConfirm: () => void | Promise<unknown>;
  /** Called on Cancel and on Esc. Not called while a confirmation is in progress. */
  onCancel: () => void;
  /** Forces the busy state (confirm button spinning, everything else inert). */
  loading?: boolean;
  /** Which button gets focus first. Defaults to Cancel for `danger` and Confirm otherwise. */
  initialFocus?: 'confirm' | 'cancel';
  /** A press on the backdrop cancels. Off by default so a confirmation is never dismissed by accident. */
  closeOnBackdrop?: boolean;
  size?: ModalSize;
  container?: HTMLElement | null;
  className?: string;
}

/**
 * A yes/no question in an `alertdialog`. A thin layer over `Modal` that supplies the buttons, the
 * busy state for async confirmations and a safe default focus.
 */
export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(function ConfirmDialog(
  {
    open,
    title,
    description,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    color = 'primary',
    onConfirm,
    onCancel,
    loading,
    initialFocus,
    closeOnBackdrop = false,
    size = 'sm',
    container,
    className,
  },
  ref,
) {
  const [pending, setPending] = useState(false);
  const busy = loading ?? pending;
  const confirmRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const cancelRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const focusTarget = initialFocus ?? (color === 'danger' ? 'cancel' : 'confirm');

  const handleConfirm = () => {
    const result = onConfirm();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setPending(true);
      Promise.resolve(result).then(
        () => setPending(false),
        (error: unknown) => {
          // The dialog goes back to normal so the user can retry; the error is not swallowed.
          setPending(false);
          console.error(error);
        },
      );
    }
  };

  return (
    <Modal
      ref={ref}
      open={open}
      role="alertdialog"
      size={size}
      title={title}
      description={description}
      showCloseButton={false}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={!busy}
      initialFocusRef={focusTarget === 'cancel' ? cancelRef : confirmRef}
      container={container}
      className={className}
      onClose={() => {
        if (!busy) onCancel();
      }}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="outline"
            color="neutral"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} color={color} loading={busy} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
});
