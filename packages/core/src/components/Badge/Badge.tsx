import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';

export type BadgePlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'content'> {
  /** What the badge shows: a number (capped by `max`) or short text. */
  content?: ReactNode;
  /** Largest number shown before it turns into `max+`. Defaults to 99. */
  max?: number;
  /** A small dot with no content, for "something is new". */
  dot?: boolean;
  /** Shows the badge when `content` is 0. By default a zero count is hidden. */
  showZero?: boolean;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
  color?: AxonColor;
  /** Corner of the children the badge sits on. Only used when the badge wraps children. */
  placement?: BadgePlacement;
  /** Accessible name for the badge, e.g. "3 unread messages". */
  label?: string;
  /** Anchors the badge to this element's corner. Without children the badge is a standalone pill. */
  children?: ReactNode;
}

/**
 * A small count, status or label. Wrap an element (an icon button, an avatar) to pin it to a
 * corner, or use it on its own as a pill. Remember to name the combined meaning, for example by
 * setting `label` or putting the count in the wrapped control's `aria-label`.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    content,
    max = 99,
    dot = false,
    showZero = false,
    variant = 'solid',
    size = 'md',
    color = 'danger',
    placement = 'top-right',
    label,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isNumber = typeof content === 'number';
  const hidden =
    !dot &&
    (content === undefined ||
      content === null ||
      content === false ||
      content === '' ||
      (isNumber && content === 0 && !showZero));
  const shown = isNumber && content > max ? `${max}+` : content;

  const badge = hidden ? null : (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className={cx(
        'axon-badge__badge',
        `axon-badge--${variant}`,
        `axon-badge--${size}`,
        `axon-badge--${color}`,
        dot && 'axon-badge--dot',
        Boolean(children) && `axon-badge--${placement}`,
      )}
    >
      {dot ? null : shown}
    </span>
  );

  if (!children) {
    return badge === null ? null : (
      <span {...rest} ref={ref} className={cx('axon-badge', className)}>
        {badge}
      </span>
    );
  }
  return (
    <span {...rest} ref={ref} className={cx('axon-badge', 'axon-badge--anchor', className)}>
      {children}
      {badge}
    </span>
  );
});
