import {
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { ButtonGroupContext, type ButtonVariant } from '../ButtonGroup/ButtonGroupContext';

export type { ButtonVariant };

export interface ButtonOwnProps {
  /** Visual style. Defaults to `solid`, or the enclosing ButtonGroup's variant. */
  variant?: ButtonVariant;
  size?: AxonSize;
  color?: AxonColor;
  /** Shows a spinner, keeps the button's width, sets `aria-busy` and ignores clicks. */
  loading?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

export type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps | 'color'> & {
    href?: undefined;
  };

export type ButtonAsLinkProps = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps | 'color'> & {
    /** When set, the button renders as an `<a>`. */
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const group = useContext(ButtonGroupContext);
    const {
      variant: variantProp,
      size: sizeProp,
      color: colorProp,
      loading = false,
      startIcon,
      endIcon,
      fullWidth = false,
      disabled: disabledProp,
      className,
      children,
      onClick,
      ...rest
    } = props;

    const variant = variantProp ?? group?.variant ?? 'solid';
    const size = sizeProp ?? group?.size ?? 'md';
    const color = colorProp ?? group?.color ?? 'primary';
    const disabled = disabledProp ?? group?.disabled ?? false;

    const classes = cx(
      'axon-button',
      `axon-button--${variant}`,
      `axon-button--${size}`,
      `axon-button--${color}`,
      fullWidth && 'axon-button--full-width',
      loading && 'axon-button--loading',
      disabled && 'axon-button--disabled',
      className,
    );

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }
      (onClick as MouseEventHandler<HTMLElement> | undefined)?.(event);
    };

    const content = (
      <>
        <span className="axon-button__content">
          {startIcon ? (
            <span className="axon-button__icon axon-button__icon--start" aria-hidden="true">
              {startIcon}
            </span>
          ) : null}
          {children !== undefined && children !== null && children !== false ? (
            <span className="axon-button__label">{children}</span>
          ) : null}
          {endIcon ? (
            <span className="axon-button__icon axon-button__icon--end" aria-hidden="true">
              {endIcon}
            </span>
          ) : null}
        </span>
        {loading ? <span className="axon-button__spinner" aria-hidden="true" /> : null}
      </>
    );

    if (props.href !== undefined) {
      const { href, tabIndex, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <a
          {...anchorRest}
          ref={ref as Ref<HTMLAnchorElement>}
          // A disabled link has no href, so it cannot be followed or focused by accident.
          href={disabled ? undefined : href}
          role={disabled ? 'link' : undefined}
          tabIndex={disabled ? -1 : tabIndex}
          aria-disabled={disabled || undefined}
          aria-busy={loading || undefined}
          className={classes}
          onClick={handleClick}
        >
          {content}
        </a>
      );
    }

    const { type = 'button', ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        {...buttonRest}
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled}
        aria-busy={loading || undefined}
        className={classes}
        onClick={handleClick}
      >
        {content}
      </button>
    );
  },
);
