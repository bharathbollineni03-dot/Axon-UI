import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type EmptyStateTitleTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** A picture or icon above the title. Decorative: the title says what it means. */
  icon?: ReactNode;
  /** What is empty, or what happened. */
  title: ReactNode;
  /** Heading element for the title, to fit the page's outline. Defaults to `h3`. */
  titleAs?: EmptyStateTitleTag;
  /** Why it is empty and what to do about it. */
  description?: ReactNode;
  /** The next step: usually a `Button`, or a few of them. */
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Extra content between the description and the action. */
  children?: ReactNode;
}

/**
 * What to show in place of a list, table or page that has nothing to display yet: an icon, a
 * title, an explanation and a way forward. It is plain content, not a live region; announce
 * changes yourself if it replaces content the user was just looking at.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, titleAs = 'h3', description, action, size = 'md', className, children, ...rest },
  ref,
) {
  const Title: ElementType = titleAs;
  return (
    <div
      {...rest}
      ref={ref}
      className={cx('axon-empty-state', `axon-empty-state--${size}`, className)}
    >
      {icon ? (
        <div className="axon-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <Title className="axon-empty-state__title">{title}</Title>
      {description ? <p className="axon-empty-state__description">{description}</p> : null}
      {children ? <div className="axon-empty-state__content">{children}</div> : null}
      {action ? <div className="axon-empty-state__action">{action}</div> : null}
    </div>
  );
});
