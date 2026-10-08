import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Grid, GridItem, type Responsive, type Space } from '@axon/core';

export interface FormGridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Columns from the `sm` breakpoint up. Below it every field takes the full width. A responsive
   * value such as `{ sm: 2, lg: 3 }` works too.
   */
  columns?: number | Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', number>>;
  gap?: Responsive<Space>;
  children?: ReactNode;
}

/** Lays fields out in responsive columns. Use `FormGridItem` for a field that spans more than one. */
export const FormGrid = forwardRef<HTMLDivElement, FormGridProps>(function FormGrid(
  { columns = 2, gap = 4, children, ...rest },
  ref,
) {
  const responsive = typeof columns === 'number' ? { sm: columns } : columns;
  return (
    <Grid {...rest} ref={ref} columns={{ base: 1, ...responsive }} gap={gap}>
      {children}
    </Grid>
  );
});

export interface FormGridItemProps extends HTMLAttributes<HTMLDivElement> {
  /** How many columns the field spans from `sm` up: a number, or `'full'` for the whole row. */
  span?: number | 'full';
  children?: ReactNode;
}

/** A cell of a `FormGrid`. */
export const FormGridItem = forwardRef<HTMLDivElement, FormGridItemProps>(function FormGridItem(
  { span = 1, children, ...rest },
  ref,
) {
  return (
    <GridItem {...rest} ref={ref} span={{ base: 1, sm: span }}>
      {children}
    </GridItem>
  );
});
