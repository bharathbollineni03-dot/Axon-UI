import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type ImgHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import type { PolymorphicComponent } from '../../internal/polymorphic';

export interface CardOwnProps {
  /** `outlined` (default) draws a border, `elevated` a shadow, `filled` a tinted background. */
  variant?: 'outlined' | 'elevated' | 'filled';
  /** Shadow depth for the `elevated` variant, 0 (none) to 3. Defaults to 1. */
  elevation?: 0 | 1 | 2 | 3;
  /** Adds hover and focus styles. Pair with `onClick`, or render as a link with `href`. */
  clickable?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * A surface that groups related content. Compose it from `CardHeader`, `CardMedia`,
 * `CardContent` and `CardFooter`. A clickable card without an interactive element of its own
 * becomes a keyboard-operable button (`role="button"`); with `href` it renders as a link.
 */
export const Card = forwardRef<
  HTMLElement,
  CardOwnProps & {
    as?: ElementType;
    href?: string;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
    tabIndex?: number;
    role?: string;
  }
>(function Card(
  {
    as,
    variant = 'outlined',
    elevation = 1,
    clickable,
    disabled,
    className,
    onClick,
    onKeyDown,
    tabIndex,
    role,
    href,
    ...rest
  },
  ref,
) {
  const Component = as ?? (href ? 'a' : 'div');
  // A plain div that is clickable needs the semantics and keyboard support of a button.
  const actsAsButton = Boolean(clickable && Component === 'div' && onClick);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !actsAsButton || disabled) return;
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <Component
      {...rest}
      ref={ref}
      href={disabled ? undefined : href}
      role={role ?? (actsAsButton ? 'button' : undefined)}
      tabIndex={tabIndex ?? (actsAsButton && !disabled ? 0 : undefined)}
      aria-disabled={disabled || undefined}
      className={cx(
        'axon-card',
        `axon-card--${variant}`,
        variant === 'elevated' && `axon-card--elevation-${elevation}`,
        clickable && 'axon-card--clickable',
        disabled && 'axon-card--disabled',
        className,
      )}
      onClick={onClick || disabled ? handleClick : undefined}
      onKeyDown={actsAsButton || onKeyDown ? handleKeyDown : undefined}
    />
  );
}) as unknown as PolymorphicComponent<
  'div',
  CardOwnProps & { href?: string; onClick?: (event: MouseEvent<HTMLElement>) => void }
>;

export interface CardHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Shown before the title, e.g. an `Avatar`. */
  avatar?: ReactNode;
  /** Shown at the end, e.g. an `IconButton` menu trigger. */
  action?: ReactNode;
  /** The element used for the title. Defaults to `div`; use `h3` and so on to add it to the outline. */
  titleAs?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { title, subtitle, avatar, action, titleAs: TitleTag = 'div', className, ...rest },
  ref,
) {
  return (
    <div {...rest} ref={ref} className={cx('axon-card__header', className)}>
      {avatar ? <div className="axon-card__avatar">{avatar}</div> : null}
      <div className="axon-card__heading">
        {title ? <TitleTag className="axon-card__title">{title}</TitleTag> : null}
        {subtitle ? <div className="axon-card__subtitle">{subtitle}</div> : null}
      </div>
      {action ? <div className="axon-card__action">{action}</div> : null}
    </div>
  );
});

export interface CardMediaProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'children'> {
  /** CSS aspect ratio such as `16 / 9`. */
  aspectRatio?: string;
  /** Custom media (a video, a chart) used instead of an image. */
  children?: ReactNode;
}

/** An edge-to-edge image or custom media. Pass `alt=""` for a purely decorative image. */
export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(function CardMedia(
  { aspectRatio, className, style, children, src, alt, ...imgProps },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx('axon-card__media', className)}
      style={aspectRatio ? { aspectRatio, ...style } : style}
    >
      {children ?? (src ? <img {...imgProps} src={src} alt={alt ?? ''} loading="lazy" /> : null)}
    </div>
  );
});

export interface CardSectionProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(function CardContent(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('axon-card__content', className)} />;
});

export interface CardFooterProps extends CardSectionProps {
  /** Where the actions sit. Defaults to `end`. */
  align?: 'start' | 'end' | 'between';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { align = 'end', className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={cx('axon-card__footer', `axon-card__footer--${align}`, className)}
    />
  );
});
