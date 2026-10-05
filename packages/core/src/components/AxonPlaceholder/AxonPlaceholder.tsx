import { forwardRef, type HTMLAttributes } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';

export interface AxonPlaceholderProps extends HTMLAttributes<HTMLDivElement> {
  size?: AxonSize;
  color?: AxonColor;
  variant?: 'solid' | 'outline';
}

/**
 * Pipeline check component: proves build, CSS, tests and Storybook work end to end.
 * Remove once real components exist.
 */
export const AxonPlaceholder = forwardRef<HTMLDivElement, AxonPlaceholderProps>(
  function AxonPlaceholder(
    { size = 'md', color = 'primary', variant = 'solid', className, children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cx(
          'axon-placeholder',
          `axon-placeholder--${size}`,
          `axon-placeholder--${color}`,
          `axon-placeholder--${variant}`,
          className,
        )}
        {...rest}
      >
        {children ?? 'Axon UI'}
      </div>
    );
  },
);
