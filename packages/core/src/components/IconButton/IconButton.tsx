import { forwardRef, useContext, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { Button, type ButtonProps } from '../Button';
import { ButtonGroupContext } from '../ButtonGroup/ButtonGroupContext';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type IconButtonProps = DistributiveOmit<
  ButtonProps,
  'startIcon' | 'endIcon' | 'fullWidth' | 'children' | 'aria-label'
> & {
  /** Accessible name. Required because the button has no visible text. */
  'aria-label': string;
  /** The icon to display. Decorative; the name comes from `aria-label`. */
  children: ReactNode;
  shape?: 'round' | 'square';
};

/** A square or round button that contains only an icon. */
export const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
  function IconButton({ shape = 'round', variant, color, className, children, ...rest }, ref) {
    const group = useContext(ButtonGroupContext);
    return (
      <Button
        {...(rest as ButtonProps)}
        ref={ref}
        variant={variant ?? group?.variant ?? 'ghost'}
        color={color ?? group?.color ?? 'neutral'}
        className={cx('axon-button--icon-only', `axon-button--${shape}`, className)}
      >
        {children}
      </Button>
    );
  },
);
