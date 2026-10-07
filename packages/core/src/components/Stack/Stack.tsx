import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';
import { responsiveVars, spaceVar, type Responsive, type Space } from '../../internal/responsive';

export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface StackOwnProps {
  /** Main axis. Defaults to `column`. Accepts per-breakpoint values: `{ base: 'column', md: 'row' }`. */
  direction?: Responsive<StackDirection>;
  /** Space between children, from the theme spacing scale. */
  gap?: Responsive<Space>;
  /** Cross-axis alignment. */
  align?: Responsive<StackAlign>;
  /** Main-axis distribution. */
  justify?: Responsive<StackJustify>;
  wrap?: Responsive<boolean>;
  /** Rendered between every pair of children, e.g. `<Divider />`. */
  divider?: ReactNode;
  /** Lays out as `inline-flex` so the stack shrinks to its content. */
  inline?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
} as const;

/** A flexbox row or column with a consistent gap. Every layout prop can change per breakpoint. */
export const Stack = forwardRef<HTMLElement, StackOwnProps & { as?: ElementType }>(function Stack(
  {
    as: Component = 'div',
    direction,
    gap,
    align,
    justify,
    wrap,
    divider,
    inline,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const vars: CSSProperties = {
    ...responsiveVars('stack-direction', direction, (v) => v),
    ...responsiveVars('stack-gap', gap, spaceVar),
    ...responsiveVars('stack-align', align, (v) => ALIGN[v]),
    ...responsiveVars('stack-justify', justify, (v) => JUSTIFY[v]),
    ...responsiveVars('stack-wrap', wrap, (v) => (v ? 'wrap' : 'nowrap')),
  };

  const content = divider
    ? Children.toArray(children).flatMap((child, index) =>
        index === 0
          ? [child]
          : [
              <Fragment key={`divider-${isValidElement(child) ? (child.key ?? index) : index}`}>
                {divider}
              </Fragment>,
              child,
            ],
      )
    : children;

  return (
    <Component
      {...rest}
      ref={ref}
      className={cx('axon-stack', inline && 'axon-stack--inline', className)}
      style={{ ...vars, ...style }}
    >
      {content}
    </Component>
  );
}) as unknown as PolymorphicComponent<'div', StackOwnProps>;
