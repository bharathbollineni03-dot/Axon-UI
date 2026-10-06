import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { CloseIcon } from '../../internal/icons';

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'onClick'> {
  /** The chip's text. `children` works too. */
  label?: ReactNode;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
  color?: AxonColor;
  /** Shown before the label. Decorative. */
  icon?: ReactNode;
  /** Makes the chip a button (a filter, a toggle). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Shows a remove button and removes on Backspace/Delete. */
  onDelete?: () => void;
  /** Accessible name of the remove button. Defaults to "Remove <label>". */
  deleteLabel?: string;
  /** For a clickable chip: whether it is on. Sets `aria-pressed`. */
  selected?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

/** A compact element for a tag, filter or selection. Clickable and removable on request. */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  {
    label,
    children,
    variant = 'subtle',
    size = 'md',
    color = 'neutral',
    icon,
    onClick,
    onDelete,
    deleteLabel,
    selected,
    disabled = false,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const text = label ?? children;
  const clickable = Boolean(onClick);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || !onDelete) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onDelete();
    }
  };

  const content = (
    <>
      {icon ? (
        <span className="axon-chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="axon-chip__label">{text}</span>
    </>
  );

  return (
    // The key handler only receives keys that bubble up from the chip's focusable buttons.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      {...rest}
      ref={ref}
      className={cx(
        'axon-chip',
        `axon-chip--${variant}`,
        `axon-chip--${size}`,
        `axon-chip--${color}`,
        clickable && 'axon-chip--clickable',
        selected && 'axon-chip--selected',
        disabled && 'axon-chip--disabled',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {clickable ? (
        <button
          type="button"
          className="axon-chip__main"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onClick}
        >
          {content}
        </button>
      ) : (
        <span className="axon-chip__main">{content}</span>
      )}
      {onDelete ? (
        <button
          type="button"
          className="axon-chip__delete"
          aria-label={deleteLabel ?? (typeof text === 'string' ? `Remove ${text}` : 'Remove')}
          disabled={disabled}
          onClick={onDelete}
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
});

/** A non-interactive label for categorizing content. The same component as `Chip`. */
export const Tag = Chip;
