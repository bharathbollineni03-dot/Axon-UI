import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { CloseIcon } from '../../internal/icons';
import { StatusIcon, type Status } from '../../internal/StatusIcon/StatusIcon';

export type AlertStatus = Status;

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** What kind of message this is. Sets the color and the default icon. */
  status?: AlertStatus;
  variant?: 'subtle' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  /** A short heading. It is a plain element, not a heading, so it never disturbs the page outline. */
  title?: ReactNode;
  /** Replaces the status icon, or pass `false` to show none. Decorative. */
  icon?: ReactNode | false;
  /** Buttons or links shown under the message. */
  actions?: ReactNode;
  /** Shows a close button that calls this. Hide the alert yourself in response. */
  onClose?: () => void;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** The message. */
  children?: ReactNode;
}

/**
 * An inline message about the state of something on the page. A `danger` alert has
 * `role="alert"` and is announced right away; the others have `role="status"` and are announced
 * politely. Override `role` (for example to `"none"` for static content that was already on the
 * page when it loaded).
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    status = 'info',
    variant = 'subtle',
    size = 'md',
    title,
    icon,
    actions,
    onClose,
    closeLabel = 'Dismiss',
    role,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      role={role ?? (status === 'danger' ? 'alert' : 'status')}
      className={cx(
        'axon-alert',
        `axon-alert--${status}`,
        `axon-alert--${variant}`,
        `axon-alert--${size}`,
        className,
      )}
    >
      {icon === false ? null : (
        <span className="axon-alert__icon" aria-hidden="true">
          {icon ?? <StatusIcon status={status} />}
        </span>
      )}
      <div className="axon-alert__content">
        {title ? <div className="axon-alert__title">{title}</div> : null}
        {children ? <div className="axon-alert__message">{children}</div> : null}
        {actions ? <div className="axon-alert__actions">{actions}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          className="axon-alert__close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
});
