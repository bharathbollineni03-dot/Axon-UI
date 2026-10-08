import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { useId } from '@axonui/core';

export interface AuthCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Your logo, above the title. An `img`, an SVG, or anything else. */
  logo?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Links under the form, such as "Don't have an account? Sign up". */
  footer?: ReactNode;
  /** The title's heading level. Defaults to 1, for a page of its own; use 2 or 3 inside a page. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** How wide the card is: `sm` 24rem (default), `md` 32rem or `lg` 44rem. */
  size?: 'sm' | 'md' | 'lg';
  /** Fills the height of the viewport and centers the card in it. */
  centered?: boolean;
  /** Drops the card's border, shadow and padding, keeping the header and footer. */
  bare?: boolean;
  children?: ReactNode;
}

/**
 * The layout around an authentication form: a centered card with a logo, a title, a description
 * and footer links. Every prebuilt form uses it; use it directly around your own forms too.
 */
export const AuthCard = forwardRef<HTMLElement, AuthCardProps>(function AuthCard(
  {
    logo,
    title,
    description,
    footer,
    headingLevel = 1,
    size = 'sm',
    centered = false,
    bare = false,
    id,
    className,
    children,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-auth-card');
  const titleId = `${baseId}-title`;
  const Heading = `h${headingLevel}` as ElementType;

  const card = (
    <section
      {...rest}
      ref={ref}
      id={baseId}
      aria-labelledby={title ? titleId : undefined}
      className={[
        'axon-auth-card',
        `axon-auth-card--${size}`,
        bare && 'axon-auth-card--bare',
        !centered && className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {logo || title || description ? (
        <header className="axon-auth-card__header">
          {logo ? <div className="axon-auth-card__logo">{logo}</div> : null}
          {title ? (
            <Heading id={titleId} className="axon-auth-card__title">
              {title}
            </Heading>
          ) : null}
          {description ? <p className="axon-auth-card__description">{description}</p> : null}
        </header>
      ) : null}
      <div className="axon-auth-card__body">{children}</div>
      {footer ? <footer className="axon-auth-card__footer">{footer}</footer> : null}
    </section>
  );

  if (!centered) return card;
  return <div className={['axon-auth-page', className].filter(Boolean).join(' ')}>{card}</div>;
});
