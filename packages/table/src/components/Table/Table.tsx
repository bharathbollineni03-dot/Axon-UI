import {
  forwardRef,
  useId,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cx } from '../../internal/cx';
import { SortIcon } from '../../internal/icons';
import { useIsScrollable } from '../../internal/useIsScrollable';

export type TableAlign = 'start' | 'center' | 'end';
export type TableSortDirection = 'asc' | 'desc' | 'none';

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /** `TableHead`, `TableBody` and `TableFoot`. */
  children?: ReactNode;
  /** A visible title for the table. Screen readers announce it as the table's name. */
  caption?: ReactNode;
  captionSide?: 'top' | 'bottom';
  /** Keeps the caption for assistive technology but does not draw it. */
  hideCaption?: boolean;
  /** Shades every other body row. */
  striped?: boolean;
  /** Draws lines between all cells, not just between rows. */
  bordered?: boolean;
  /** Tighter cell padding. */
  dense?: boolean;
  /** Highlights the row under the pointer. */
  hoverable?: boolean;
  /** Keeps the header in view while the body scrolls. Needs `maxHeight` (or a parent that limits the height). */
  stickyHeader?: boolean;
  /** Limits the height of the table; the body scrolls inside it. */
  maxHeight?: number | string;
  /** Names the scrolling region when the table is wider or taller than its space. Defaults to the caption. */
  scrollLabel?: string;
  containerClassName?: string;
  containerStyle?: CSSProperties;
}

/**
 * A plain, semantic `<table>` for static data: no state, no behaviour, just good markup. It sits in a
 * container that scrolls when the table does not fit, and that container becomes a keyboard tab stop
 * only when there is something to scroll. For sorting, filtering and large data, use `DataGrid`.
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  {
    children,
    caption,
    captionSide = 'top',
    hideCaption = false,
    striped = false,
    bordered = false,
    dense = false,
    hoverable = false,
    stickyHeader = false,
    maxHeight,
    scrollLabel,
    containerClassName,
    containerStyle,
    className,
    ...rest
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollable = useIsScrollable(containerRef);
  const captionId = useId();
  const hasCaption = caption !== undefined && caption !== null && caption !== false;
  const regionLabel =
    scrollLabel ?? (typeof caption === 'string' ? caption : rest['aria-label']) ?? undefined;

  const labelProps = scrollable
    ? {
        tabIndex: 0,
        ...(regionLabel
          ? { role: 'region', 'aria-label': regionLabel }
          : hasCaption
            ? { role: 'region', 'aria-labelledby': captionId }
            : {}),
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={cx(
        'axon-table-container',
        stickyHeader && 'axon-table-container--sticky',
        containerClassName,
      )}
      style={{ ...(maxHeight === undefined ? null : { maxHeight }), ...containerStyle }}
      {...labelProps}
    >
      <table
        ref={ref}
        className={cx(
          'axon-table',
          striped && 'axon-table--striped',
          bordered && 'axon-table--bordered',
          dense && 'axon-table--dense',
          hoverable && 'axon-table--hoverable',
          stickyHeader && 'axon-table--sticky',
          className,
        )}
        {...rest}
      >
        {hasCaption ? (
          <caption
            id={captionId}
            className={cx(
              'axon-table__caption',
              `axon-table__caption--${captionSide}`,
              hideCaption && 'axon-visually-hidden',
            )}
          >
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
});

export const TableHead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHead({ className, ...rest }, ref) {
  return <thead ref={ref} className={cx('axon-table__head', className)} {...rest} />;
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...rest }, ref) {
  return <tbody ref={ref} className={cx('axon-table__body', className)} {...rest} />;
});

export const TableFoot = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFoot({ className, ...rest }, ref) {
  return <tfoot ref={ref} className={cx('axon-table__foot', className)} {...rest} />;
});

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Marks the row as chosen. */
  selected?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected, className, ...rest },
  ref,
) {
  return (
    <tr
      ref={ref}
      aria-selected={selected}
      className={cx('axon-table__row', selected && 'axon-table__row--selected', className)}
      {...rest}
    />
  );
});

export interface TableHeaderCellProps extends Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'align'
> {
  align?: TableAlign;
  /** The column's current sort, announced as `aria-sort`. Leave undefined for a column that is not sortable. */
  sort?: TableSortDirection;
  /** Makes the header a button that asks for the next sort. Pair with `sort`. */
  onSort?: () => void;
}

const ariaSort = { asc: 'ascending', desc: 'descending', none: 'none' } as const;

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    { align = 'start', sort, onSort, scope = 'col', className, children, ...rest },
    ref,
  ) {
    return (
      <th
        ref={ref}
        scope={scope}
        aria-sort={sort ? ariaSort[sort] : undefined}
        className={cx(
          'axon-table__cell',
          'axon-table__header-cell',
          `axon-table__cell--${align}`,
          className,
        )}
        {...rest}
      >
        {onSort ? (
          <button
            type="button"
            className={cx(
              'axon-table__sort',
              sort && sort !== 'none' && 'axon-table__sort--active',
            )}
            data-sort={sort ?? 'none'}
            onClick={onSort}
          >
            <span>{children}</span>
            <SortIcon className="axon-table__sort-icon axon-sort-icon" data-sort={sort ?? 'none'} />
          </button>
        ) : (
          children
        )}
      </th>
    );
  },
);

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: TableAlign;
  /** Right-aligns and uses figures of equal width, so columns of numbers line up. */
  numeric?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align, numeric = false, className, ...rest },
  ref,
) {
  const resolved = align ?? (numeric ? 'end' : 'start');
  return (
    <td
      ref={ref}
      className={cx(
        'axon-table__cell',
        `axon-table__cell--${resolved}`,
        numeric && 'axon-table__cell--numeric',
        className,
      )}
      {...rest}
    />
  );
});
