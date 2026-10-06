import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from '../../internal/icons';
import { getPaginationRange, type PaginationItem } from './range';

export interface PaginationProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'onChange' | 'defaultValue' | 'color'
> {
  /** The total number of pages. */
  count: number;
  /** The current page, starting at 1. Controlled. */
  page?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
  /** Pages shown on each side of the current page. Defaults to 1. */
  siblingCount?: number;
  /** Pages always shown at the start and the end. Defaults to 1. */
  boundaryCount?: number;
  /** Adds buttons for the first and the last page. */
  showFirstLast?: boolean;
  /** Hides the previous and next buttons. */
  hidePrevNext?: boolean;
  size?: AxonSize;
  color?: AxonColor;
  variant?: 'outlined' | 'text';
  disabled?: boolean;
  /** Accessible name of a page button. Defaults to "Page N". */
  getPageLabel?: (page: number) => string;
  previousLabel?: string;
  nextLabel?: string;
  firstLabel?: string;
  lastLabel?: string;
}

/** Page navigation: numbered buttons with previous/next, collapsing long ranges with ellipses. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    count,
    page: pageProp,
    defaultPage = 1,
    onChange,
    siblingCount = 1,
    boundaryCount = 1,
    showFirstLast = false,
    hidePrevNext = false,
    size = 'md',
    color = 'primary',
    variant = 'outlined',
    disabled = false,
    getPageLabel = (n) => `Page ${n}`,
    previousLabel = 'Previous page',
    nextLabel = 'Next page',
    firstLabel = 'First page',
    lastLabel = 'Last page',
    className,
    'aria-label': ariaLabel = 'Pagination',
    ...rest
  },
  ref,
) {
  const [page, setPage] = useControllableState<number>({
    value: pageProp,
    defaultValue: defaultPage,
    onChange,
  });
  const items = getPaginationRange({ page, count, siblingCount, boundaryCount });

  const renderButton = (
    key: string,
    label: string,
    target: number,
    content: ReactNode,
    options: { selected?: boolean; unavailable?: boolean } = {},
  ) => (
    <li key={key} className="axon-pagination__item">
      <button
        type="button"
        aria-label={label}
        aria-current={options.selected ? 'page' : undefined}
        disabled={disabled || options.unavailable}
        className={cx(
          'axon-pagination__button',
          options.selected && 'axon-pagination__button--selected',
        )}
        onClick={() => setPage(target)}
      >
        {content}
      </button>
    </li>
  );

  const renderItem = (item: PaginationItem) => {
    if (typeof item === 'number') {
      return renderButton(`page-${item}`, getPageLabel(item), item, item, {
        selected: item === page,
      });
    }
    return (
      <li key={item} className="axon-pagination__item axon-pagination__ellipsis" aria-hidden="true">
        …
      </li>
    );
  };

  return (
    <nav
      {...rest}
      ref={ref}
      aria-label={ariaLabel}
      className={cx(
        'axon-pagination',
        `axon-pagination--${size}`,
        `axon-pagination--${color}`,
        `axon-pagination--${variant}`,
        className,
      )}
    >
      <ul className="axon-pagination__list">
        {showFirstLast
          ? renderButton('first', firstLabel, 1, <ChevronsLeftIcon />, {
              unavailable: page <= 1,
            })
          : null}
        {hidePrevNext
          ? null
          : renderButton('previous', previousLabel, page - 1, <ChevronLeftIcon />, {
              unavailable: page <= 1,
            })}
        {items.map(renderItem)}
        {hidePrevNext
          ? null
          : renderButton('next', nextLabel, page + 1, <ChevronRightIcon />, {
              unavailable: page >= count,
            })}
        {showFirstLast
          ? renderButton('last', lastLabel, count, <ChevronsRightIcon />, {
              unavailable: page >= count,
            })
          : null}
      </ul>
    </nav>
  );
});
