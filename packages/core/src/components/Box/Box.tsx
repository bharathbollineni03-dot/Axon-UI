import { forwardRef, type CSSProperties, type ElementType } from 'react';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';
import { spaceVar, type Space } from '../../internal/responsive';

export interface BoxOwnProps {
  /** Padding, margin: steps from the theme spacing scale. `x`/`y` set both sides of an axis. */
  p?: Space;
  px?: Space;
  py?: Space;
  m?: Space;
  mx?: Space;
  my?: Space;
  /** A semantic surface color. */
  bg?: 'background' | 'surface' | 'raised' | 'muted';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Draws a 1px border in the theme border color. */
  bordered?: boolean;
}

const BACKGROUNDS = {
  background: 'var(--axon-color-background)',
  surface: 'var(--axon-color-surface)',
  raised: 'var(--axon-color-surface-raised)',
  muted: 'var(--axon-color-surface-muted)',
} as const;

/**
 * A `div` (or any element through `as`) with a few theme-token style shortcuts. Use it as the
 * building block for layout; reach for `Stack` or `Grid` to arrange children.
 */
export const Box = forwardRef<
  HTMLElement,
  BoxOwnProps & { as?: ElementType; className?: string; style?: CSSProperties }
>(function Box(
  {
    as: Component = 'div',
    p,
    px,
    py,
    m,
    mx,
    my,
    bg,
    radius,
    shadow,
    bordered,
    className,
    style,
    ...rest
  },
  ref,
) {
  const tokens: CSSProperties = {};
  if (p !== undefined) tokens.padding = spaceVar(p);
  if (px !== undefined) {
    tokens.paddingInline = spaceVar(px);
  }
  if (py !== undefined) {
    tokens.paddingBlock = spaceVar(py);
  }
  if (m !== undefined) tokens.margin = spaceVar(m);
  if (mx !== undefined) tokens.marginInline = spaceVar(mx);
  if (my !== undefined) tokens.marginBlock = spaceVar(my);
  if (bg) tokens.backgroundColor = BACKGROUNDS[bg];
  if (radius) tokens.borderRadius = `var(--axon-radius-${radius})`;
  if (shadow) tokens.boxShadow = `var(--axon-shadow-${shadow})`;
  if (bordered) tokens.border = '1px solid var(--axon-color-border)';
  return (
    <Component
      {...rest}
      ref={ref}
      className={cx('axon-box', className)}
      style={{ ...tokens, ...style }}
    />
  );
}) as unknown as PolymorphicComponent<'div', BoxOwnProps>;
