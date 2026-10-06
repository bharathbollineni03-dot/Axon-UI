import { Children, forwardRef, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { AvatarGroupContext, type AvatarShape, type AvatarSize } from './AvatarGroupContext';

export interface AvatarGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  /** Avatars shown before the rest collapse into a "+N" tile. Defaults to showing all. */
  max?: number;
  /** Size, shape and color shared with the avatars inside (an avatar's own props win). */
  size?: AvatarSize;
  shape?: AvatarShape;
  color?: AxonColor;
  /** Text for the "+N" tile's accessible name. Defaults to "N more". */
  getOverflowLabel?: (count: number) => string;
  children?: ReactNode;
}

/** A row of overlapping avatars, with the overflow shown as "+N". */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  {
    max,
    size = 'md',
    shape = 'circle',
    color,
    getOverflowLabel = (count) => `${count} more`,
    className,
    children,
    ...rest
  },
  ref,
) {
  const avatars = Children.toArray(children);
  const visible = max !== undefined && avatars.length > max ? avatars.slice(0, max) : avatars;
  const hidden = avatars.length - visible.length;
  const value = useMemo(() => ({ size, shape, color }), [size, shape, color]);

  return (
    <AvatarGroupContext.Provider value={value}>
      <div
        role="group"
        {...rest}
        ref={ref}
        className={cx('axon-avatar-group', `axon-avatar-group--${size}`, className)}
      >
        {visible}
        {hidden > 0 ? (
          <span
            role="img"
            aria-label={getOverflowLabel(hidden)}
            className={cx(
              'axon-avatar',
              'axon-avatar--count',
              `axon-avatar--${size}`,
              `axon-avatar--${shape}`,
            )}
          >
            <span aria-hidden="true">+{hidden}</span>
          </span>
        ) : null}
      </div>
    </AvatarGroupContext.Provider>
  );
});
