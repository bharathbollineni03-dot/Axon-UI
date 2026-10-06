import { forwardRef, useMemo, type HTMLAttributes } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { ButtonGroupContext, type ButtonVariant } from './ButtonGroupContext';

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Default size for the buttons inside; a button's own `size` wins. */
  size?: AxonSize;
  variant?: ButtonVariant;
  color?: AxonColor;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  /** Joins the buttons into one segmented control. Set to `false` for a spaced row. */
  attached?: boolean;
  fullWidth?: boolean;
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  {
    size,
    variant,
    color,
    disabled,
    orientation = 'horizontal',
    attached = true,
    fullWidth = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const value = useMemo(
    () => ({ size, variant, color, disabled }),
    [size, variant, color, disabled],
  );
  return (
    <ButtonGroupContext.Provider value={value}>
      <div
        role="group"
        {...rest}
        ref={ref}
        className={cx(
          'axon-button-group',
          `axon-button-group--${orientation}`,
          attached && 'axon-button-group--attached',
          fullWidth && 'axon-button-group--full-width',
          className,
        )}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
});
