import { forwardRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';
import {
  breakpointNames,
  responsiveVars,
  spaceVar,
  type Responsive,
  type Space,
} from '../../internal/responsive';

export interface GridOwnProps {
  /** Number of equal columns. Defaults to 12. Accepts per-breakpoint values. */
  columns?: Responsive<number>;
  /** Space between cells, from the theme spacing scale. */
  gap?: Responsive<Space>;
  inline?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A CSS grid of equal columns (12 by default). Place children with `GridItem`. */
export const Grid = forwardRef<HTMLElement, GridOwnProps & { as?: ElementType }>(function Grid(
  { as: Component = 'div', columns, gap, inline, className, style, ...rest },
  ref,
) {
  const vars: CSSProperties = {
    ...responsiveVars('grid-columns', columns, (n) => `repeat(${n}, minmax(0, 1fr))`),
    ...responsiveVars('grid-gap', gap, spaceVar),
  };
  return (
    <Component
      {...rest}
      ref={ref}
      className={cx('axon-grid', inline && 'axon-grid--inline', className)}
      style={{ ...vars, ...style }}
    />
  );
}) as unknown as PolymorphicComponent<'div', GridOwnProps>;

/** How many columns a `GridItem` covers, or `'full'` for the whole row. */
export type GridSpan = number | 'full';

export interface GridItemOwnProps {
  /** Columns to span. Accepts per-breakpoint values: `{ base: 12, md: 6, lg: 4 }`. */
  span?: Responsive<GridSpan>;
  /** Column line to start at (1-based). */
  start?: Responsive<number>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

type ColumnPlacement = { span?: GridSpan; start?: number };

const placement = ({ span, start }: ColumnPlacement) => {
  if (span === 'full') return '1 / -1';
  if (start !== undefined && span !== undefined) return `${start} / span ${span}`;
  if (span !== undefined) return `span ${span}`;
  return start !== undefined ? String(start) : 'auto';
};

const toObject = <T,>(value: Responsive<T> | undefined): Partial<Record<string, T>> =>
  value === undefined ? {} : typeof value === 'object' && value !== null ? value : { base: value };

/** Merges `span` and `start` (each possibly per-breakpoint) into one `grid-column` per breakpoint. */
function columnVars(
  span: GridItemOwnProps['span'],
  start: GridItemOwnProps['start'],
): CSSProperties {
  const spans = toObject<GridSpan>(span);
  const starts = toObject<number>(start);
  const vars: Record<string, string> = {};
  for (const key of ['base', ...breakpointNames]) {
    if (spans[key] === undefined && starts[key] === undefined) continue;
    vars[key === 'base' ? '--axon-grid-col' : `--axon-grid-col-${key}`] = placement({
      span: spans[key],
      start: starts[key],
    });
  }
  return vars;
}

export const GridItem = forwardRef<HTMLElement, GridItemOwnProps & { as?: ElementType }>(
  function GridItem({ as: Component = 'div', span, start, className, style, ...rest }, ref) {
    return (
      <Component
        {...rest}
        ref={ref}
        className={cx('axon-grid__item', className)}
        style={{ ...columnVars(span, start), ...style }}
      />
    );
  },
) as unknown as PolymorphicComponent<'div', GridItemOwnProps>;
