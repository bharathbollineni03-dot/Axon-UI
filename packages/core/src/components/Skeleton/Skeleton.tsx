import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /** `text` is a line of text, `circle` an avatar or icon, `rect` an image or a card. */
  variant?: 'text' | 'circle' | 'rect';
  /** A number is pixels; a string is any CSS length. Text and rect default to the full width. */
  width?: number | string;
  /** A number is pixels. A circle is as tall as it is wide when only `width` is given. */
  height?: number | string;
  /** For `text`: how many lines to draw. The last of several is shorter, like a paragraph. */
  lines?: number;
  /** `pulse` fades in and out, `wave` sweeps a highlight across, `false` is still. */
  animation?: 'pulse' | 'wave' | false;
}

const toLength = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * A placeholder shaped like the content that is loading. It is hidden from assistive technology;
 * mark the region that is loading with `aria-busy="true"` (and announce when it is done) instead.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = 'text', width, height, lines = 1, animation = 'pulse', className, style, ...rest },
  ref,
) {
  const lineCount = variant === 'text' ? Math.max(1, Math.floor(lines)) : 1;
  const resolvedHeight = height ?? (variant === 'circle' ? width : undefined);
  const resolvedWidth = width ?? (variant === 'circle' ? resolvedHeight : undefined);

  const dimensions = {
    '--axon-skeleton-width': toLength(resolvedWidth),
    '--axon-skeleton-height': toLength(resolvedHeight),
  } as CSSProperties;

  const classes = cx(
    'axon-skeleton',
    `axon-skeleton--${variant}`,
    animation && `axon-skeleton--${animation}`,
  );

  if (lineCount > 1) {
    return (
      <span
        aria-hidden="true"
        {...rest}
        ref={ref}
        className={cx('axon-skeleton-lines', className)}
        style={{ ...dimensions, ...style }}
      >
        {Array.from({ length: lineCount }, (_, index) => (
          <span
            key={index}
            className={cx(classes, index === lineCount - 1 && 'axon-skeleton--last-line')}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      {...rest}
      ref={ref}
      className={cx(classes, className)}
      style={{ ...dimensions, ...style }}
    />
  );
});
