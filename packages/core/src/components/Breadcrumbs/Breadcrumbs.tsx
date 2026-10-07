import {
  forwardRef,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { ChevronRightIcon, MoreHorizontalIcon } from '../../internal/icons';
import { Link } from '../Link';

export interface BreadcrumbItem {
  label: ReactNode;
  /** Where the crumb links to. The last crumb is the current page and is never a link. */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The path from the top, ending with the current page. */
  items: BreadcrumbItem[];
  /** Shown between crumbs. Defaults to a chevron. */
  separator?: ReactNode;
  /**
   * Collapses long paths: once there are more than `maxItems` crumbs, the middle ones are hidden
   * behind a "…" button. Without it every crumb is shown.
   */
  maxItems?: number;
  /** Render links with another component, e.g. a router link: `linkAs={RouterLink}` (it receives `href`). */
  linkAs?: ElementType;
  /** Accessible name of the "…" button. */
  expandLabel?: string;
}

/** A trail showing where the current page sits in the site, as a navigation landmark. */
export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  {
    items,
    separator,
    maxItems,
    linkAs,
    expandLabel = 'Show full path',
    className,
    'aria-label': ariaLabel = 'Breadcrumb',
    ...rest
  },
  ref,
) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const collapsed = maxItems !== undefined && !expanded && items.length > maxItems && maxItems >= 2;

  // Keep `maxItems` crumbs: the first one and the last `maxItems - 1`, with the "…" button between.
  const tailCount = collapsed ? maxItems! - 1 : 0;
  const hiddenCount = collapsed ? items.length - 1 - tailCount : 0;

  const crumbs: { key: string; item?: BreadcrumbItem; index?: number }[] = [];
  items.forEach((item, index) => {
    if (collapsed && index >= 1 && index < 1 + hiddenCount) {
      if (index === 1) crumbs.push({ key: 'ellipsis' });
      return;
    }
    crumbs.push({ key: `${index}`, item, index });
  });

  const separatorNode = separator ?? <ChevronRightIcon />;

  return (
    <nav {...rest} ref={ref} aria-label={ariaLabel} className={cx('axon-breadcrumbs', className)}>
      <ol ref={listRef} className="axon-breadcrumbs__list">
        {crumbs.map((crumb, position) => {
          const isLast = position === crumbs.length - 1;
          return (
            <li key={crumb.key} className="axon-breadcrumbs__item">
              {crumb.item ? (
                isLast || (!crumb.item.href && !crumb.item.onClick) ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cx('axon-breadcrumbs__current', !isLast && 'axon-breadcrumbs__text')}
                  >
                    {crumb.item.label}
                  </span>
                ) : (
                  <Link
                    as={linkAs}
                    href={crumb.item.href}
                    onClick={crumb.item.onClick}
                    color="neutral"
                    underline="hover"
                    className="axon-breadcrumbs__link"
                  >
                    {crumb.item.label}
                  </Link>
                )
              ) : (
                <button
                  type="button"
                  className="axon-breadcrumbs__ellipsis"
                  aria-label={expandLabel}
                  onClick={() => {
                    setExpanded(true);
                    // Move focus to the first crumb that was hidden so keyboard users keep their place.
                    requestAnimationFrame(() => {
                      listRef.current?.querySelectorAll<HTMLElement>('a, button')[1]?.focus();
                    });
                  }}
                >
                  <MoreHorizontalIcon />
                </button>
              )}
              {!isLast ? (
                <span className="axon-breadcrumbs__separator" aria-hidden="true">
                  {separatorNode}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
