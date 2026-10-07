import {
  forwardRef,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';

export interface ListProps extends HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  /** Renders a numbered `<ol>` instead of a `<ul>`. */
  ordered?: boolean;
  /** Tighter rows. */
  dense?: boolean;
  /** Draws a line between rows. */
  divided?: boolean;
  /** Draws a border and rounded corners around the list. */
  bordered?: boolean;
  children?: ReactNode;
}

/** A vertical list of `ListItem`s. */
export const List = forwardRef<HTMLUListElement | HTMLOListElement, ListProps>(function List(
  { ordered = false, dense, divided, bordered, className, ...rest },
  ref,
) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      {...rest}
      ref={ref as never}
      className={cx(
        'axon-list',
        ordered && 'axon-list--ordered',
        dense && 'axon-list--dense',
        divided && 'axon-list--divided',
        bordered && 'axon-list--bordered',
        className,
      )}
    />
  );
});

export interface ListItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick'> {
  /** Leading icon or avatar. */
  icon?: ReactNode;
  /** Main text. `children` works too. */
  primary?: ReactNode;
  /** Second line, in secondary text color. */
  secondary?: ReactNode;
  /** Trailing content such as a button, a badge or a switch. It stays separately focusable. */
  action?: ReactNode;
  /** Makes the row a button. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Makes the row a link. */
  href?: string;
  /** Highlights the row and sets `aria-current` on interactive rows. */
  selected?: boolean;
  disabled?: boolean;
}

/** A row in a `List`, optionally interactive (button or link) with an icon, two lines of text and an action. */
export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  {
    icon,
    primary,
    secondary,
    action,
    onClick,
    href,
    selected,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const interactive = Boolean(onClick || href);
  const body = (
    <>
      {icon ? (
        <span className="axon-list-item__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="axon-list-item__text">
        <span className="axon-list-item__primary">{primary ?? children}</span>
        {secondary ? <span className="axon-list-item__secondary">{secondary}</span> : null}
      </span>
    </>
  );

  const main = !interactive ? (
    <div className="axon-list-item__main">{body}</div>
  ) : href && !disabled ? (
    <a
      href={href}
      className="axon-list-item__main"
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
    >
      {body}
    </a>
  ) : (
    <button
      type="button"
      className="axon-list-item__main"
      aria-current={selected ? 'true' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
    </button>
  );

  return (
    <li
      {...rest}
      ref={ref}
      className={cx(
        'axon-list-item',
        interactive && 'axon-list-item--interactive',
        selected && 'axon-list-item--selected',
        disabled && 'axon-list-item--disabled',
        className,
      )}
    >
      {main}
      {action ? <div className="axon-list-item__action">{action}</div> : null}
    </li>
  );
});
