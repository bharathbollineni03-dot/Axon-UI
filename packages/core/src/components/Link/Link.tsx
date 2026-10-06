import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor } from '../../types';
import { cx } from '../../utils/cx';
import { ExternalLinkIcon } from '../../internal/icons';
import type { PolymorphicComponent } from '../../internal/polymorphic';

export interface LinkOwnProps {
  color?: AxonColor;
  /** When the underline shows. Defaults to `hover`; links in running text should keep it `always`. */
  underline?: 'always' | 'hover' | 'none';
  /**
   * Opens in a new tab with `rel="noopener noreferrer"`, adds an icon and tells assistive
   * technology that it opens a new tab.
   */
  external?: boolean;
  /** Text read out for an external link. Defaults to "(opens in a new tab)". */
  externalLabel?: string;
  /** Removes the `href` and focusability and marks the link `aria-disabled`. */
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * A text link. Renders an `<a>`; pass `as` to render a router link component instead
 * (`<Link as={RouterLink} to="/docs">`).
 */
export const Link = forwardRef<
  HTMLElement,
  LinkOwnProps & { as?: ElementType; href?: string; tabIndex?: number }
>(function Link(
  {
    as: Component = 'a',
    color = 'primary',
    underline = 'hover',
    external = false,
    externalLabel = '(opens in a new tab)',
    disabled = false,
    href,
    tabIndex,
    onClick,
    className,
    children,
    ...rest
  },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Component
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
      {...rest}
      ref={ref}
      href={disabled ? undefined : href}
      role={disabled && Component === 'a' ? 'link' : undefined}
      tabIndex={disabled ? -1 : tabIndex}
      aria-disabled={disabled || undefined}
      className={cx(
        'axon-link',
        `axon-link--${color}`,
        `axon-link--underline-${underline}`,
        disabled && 'axon-link--disabled',
        className,
      )}
      onClick={handleClick}
    >
      {children}
      {external ? (
        <>
          <span className="axon-link__external-icon" aria-hidden="true">
            <ExternalLinkIcon />
          </span>
          <span className="axon-visually-hidden"> {externalLabel}</span>
        </>
      ) : null}
    </Component>
  );
}) as unknown as PolymorphicComponent<'a', LinkOwnProps>;
