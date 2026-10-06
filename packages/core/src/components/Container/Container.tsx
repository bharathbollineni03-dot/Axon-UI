import { forwardRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';
import { spaceVar, type Space } from '../../internal/responsive';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerOwnProps {
  /** Largest width, taken from the theme breakpoints (`sm` 640px ... `2xl` 1536px). Defaults to `lg`. */
  maxWidth?: ContainerSize;
  /** Horizontal padding (gutter) on each side. Defaults to `4`. */
  gutter?: Space;
  /** Removes the centering margin so the container sits at the start of its parent. */
  disableCenter?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Centers content and limits its width. */
export const Container = forwardRef<HTMLElement, ContainerOwnProps & { as?: ElementType }>(
  function Container(
    {
      as: Component = 'div',
      maxWidth = 'lg',
      gutter = 4,
      disableCenter,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <Component
        {...rest}
        ref={ref}
        className={cx(
          'axon-container',
          `axon-container--${maxWidth}`,
          disableCenter && 'axon-container--start',
          className,
        )}
        style={{ paddingInline: spaceVar(gutter), ...style }}
      />
    );
  },
) as unknown as PolymorphicComponent<'div', ContainerOwnProps>;
