import { forwardRef, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { cx } from '../../utils/cx';
import { useId } from '../../hooks/useId';
import { Overlay } from '../../internal/Overlay/Overlay';
import { DialogLayout, type DialogTitleTag } from '../../internal/Overlay/DialogLayout';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Why the modal asked to close. */
export type ModalCloseReason = 'escape' | 'backdrop' | 'close-button';

interface ModalBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  open: boolean;
  /** The user asked to close the modal. You decide what that means: usually set `open` to false. */
  onClose: (reason: ModalCloseReason) => void;
  size?: ModalSize;
  /** Supporting text under the title. It also becomes the dialog's description for screen readers. */
  description?: ReactNode;
  /** Actions along the bottom, usually buttons. */
  footer?: ReactNode;
  /** Heading element used for the title, to fit the page's outline. Defaults to `h2`. */
  titleAs?: DialogTitleTag;
  /** `alertdialog` is for interruptions that need an answer, such as confirmations. */
  role?: 'dialog' | 'alertdialog';
  showCloseButton?: boolean;
  closeLabel?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  /**
   * `inside` (default) keeps the dialog in the viewport and scrolls its body; `outside` lets
   * the dialog grow and scrolls the whole layer.
   */
  scrollBehavior?: 'inside' | 'outside';
  /** Element focused when the modal opens. Defaults to the dialog itself, which announces its name. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where to render. Defaults to the closest `.axon-root`, or `<body>`. */
  container?: HTMLElement | null;
  children?: ReactNode;
}

/** A modal dialog needs a name: a `title`, or an `aria-label` / `aria-labelledby`. */
type ModalLabel =
  | { title: ReactNode }
  | { title?: undefined; 'aria-label': string }
  | { title?: undefined; 'aria-labelledby': string };

export type ModalProps = ModalBaseProps & ModalLabel;

/**
 * A modal dialog: it dims the page, traps focus, locks page scroll, closes on Esc or a backdrop
 * press and returns focus to what opened it. Content goes in `children`; `title`, `description`
 * and `footer` are laid out for you and wired to the dialog's accessible name and description.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  {
    open,
    onClose,
    size = 'md',
    title,
    titleAs,
    description,
    footer,
    role = 'dialog',
    showCloseButton = true,
    closeLabel = 'Close',
    closeOnEscape = true,
    closeOnBackdrop = true,
    scrollBehavior = 'inside',
    initialFocusRef,
    container,
    id,
    className,
    children,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-modal');
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  return (
    <Overlay
      {...rest}
      ref={ref}
      open={open}
      id={baseId}
      role={role}
      container={container}
      initialFocusRef={initialFocusRef}
      closeOnEscape={closeOnEscape}
      closeOnBackdrop={closeOnBackdrop}
      onDismiss={onClose}
      aria-labelledby={title ? titleId : ariaLabelledBy}
      aria-label={title ? undefined : ariaLabel}
      aria-describedby={description ? descriptionId : ariaDescribedBy}
      containerClassName={cx(
        'axon-modal__scroll',
        scrollBehavior === 'outside' && 'axon-modal__scroll--outside',
        size === 'full' && 'axon-modal__scroll--full',
      )}
      surfaceClassName={cx('axon-modal', `axon-modal--${size}`, className)}
    >
      <DialogLayout
        title={title}
        titleAs={titleAs}
        titleId={titleId}
        description={description}
        descriptionId={descriptionId}
        footer={footer}
        showCloseButton={showCloseButton}
        closeLabel={closeLabel}
        onCloseClick={() => onClose('close-button')}
      >
        {children}
      </DialogLayout>
    </Overlay>
  );
});

/** `Dialog` is another name for `Modal`. */
export const Dialog = Modal;
