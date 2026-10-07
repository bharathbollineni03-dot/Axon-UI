import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { cx } from '../../utils/cx';
import { CloseIcon } from '../../internal/icons';
import { StatusIcon } from '../../internal/StatusIcon/StatusIcon';
import { Button } from '../Button';
import type { ToastDismissReason, ToastEntry } from './toastStore';

interface ToastItemProps {
  toast: ToastEntry;
  /** Used when the toast does not set its own `duration`. */
  defaultDuration: number;
  dismissLabel: string;
  onDismiss: (id: string, reason: ToastDismissReason) => void;
}

/** A toast with a timer that stops while the pointer is over it or focus is inside it. */
export function ToastItem({ toast, defaultDuration, dismissLabel, onDismiss }: ToastItemProps) {
  const {
    id,
    version,
    status = 'info',
    title,
    description,
    icon,
    action,
    dismissible = true,
  } = toast;
  const duration = toast.duration ?? defaultDuration;
  const timed = Number.isFinite(duration) && duration > 0;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  // Time left on the timer. It is spent while the timer runs and kept while paused, so hovering
  // a toast and leaving it again resumes where it stopped instead of starting over.
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  // A replaced toast (new `version`) or a new duration starts the countdown from the top. This
  // effect is declared before the timer below so it runs first when both are triggered at once.
  useEffect(() => {
    remaining.current = duration;
  }, [version, duration]);

  useEffect(() => {
    if (!timed || paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(id, 'timeout'), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [timed, paused, version, duration, id, onDismiss]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.stopPropagation();
      onDismiss(id, 'escape');
    }
  };

  return (
    // The key handler only receives keys that bubble up from the toast's own buttons.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      // A danger toast interrupts; the others wait for the screen reader to finish.
      role={status === 'danger' ? 'alert' : 'status'}
      aria-atomic="true"
      className={cx('axon-toast', `axon-toast--${status}`)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {icon === false ? null : (
        <span className="axon-toast__icon" aria-hidden="true">
          {icon ?? <StatusIcon status={status} />}
        </span>
      )}
      <div className="axon-toast__content">
        {title ? <div className="axon-toast__title">{title}</div> : null}
        {description ? <div className="axon-toast__description">{description}</div> : null}
        {action ? (
          <div className="axon-toast__actions">
            <Button
              size="sm"
              variant="outline"
              color={status === 'info' ? 'primary' : status}
              onClick={() => {
                action.onClick();
                onDismiss(id, 'action');
              }}
            >
              {action.label}
            </Button>
          </div>
        ) : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          className="axon-toast__close"
          aria-label={dismissLabel}
          onClick={() => onDismiss(id, 'close-button')}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
