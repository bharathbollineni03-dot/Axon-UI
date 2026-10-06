import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';

export interface AppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  /** Shown at the start: a menu button, a logo. */
  leading?: ReactNode;
  /** Shown at the end: actions, a user menu. */
  trailing?: ReactNode;
  /**
   * `static` sits in the flow, `sticky` stays at the top of its scroll container and `fixed`
   * stays at the top of the viewport (and needs space reserved for it).
   */
  position?: 'static' | 'sticky' | 'fixed';
  /** `default` is a plain surface; a color fills the bar with it. */
  color?: 'default' | AxonColor;
  /** Draws a line along the bottom edge. Defaults to `true` for a plain bar. */
  bordered?: boolean;
  /** Casts a shadow, e.g. while content scrolls beneath the bar. */
  elevated?: boolean;
  /** The bar's main content, between `leading` and `trailing`; typically the title. */
  children?: ReactNode;
}

/** The page's top bar: a `banner` landmark with leading, central and trailing areas. */
export const AppBar = forwardRef<HTMLElement, AppBarProps>(function AppBar(
  {
    leading,
    trailing,
    position = 'static',
    color = 'default',
    bordered,
    elevated = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const colored = color !== 'default';
  const showBorder = bordered ?? !colored;
  return (
    <header
      {...rest}
      ref={ref}
      className={cx(
        'axon-app-bar',
        `axon-app-bar--${color}`,
        `axon-app-bar--${position}`,
        colored && 'axon-app-bar--colored',
        showBorder && 'axon-app-bar--bordered',
        elevated && 'axon-app-bar--elevated',
        className,
      )}
    >
      {leading ? <div className="axon-app-bar__leading">{leading}</div> : null}
      <div className="axon-app-bar__content">{children}</div>
      {trailing ? <div className="axon-app-bar__trailing">{trailing}</div> : null}
    </header>
  );
});
