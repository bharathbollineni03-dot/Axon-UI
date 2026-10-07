import type { KeyboardEvent, Ref } from 'react';
import type { Header, RowData } from '@tanstack/react-table';
import { cx } from '../../internal/cx';
import { SortIcon } from '../../internal/icons';
import type { GridFeatures } from '../../internal/features';
import { cellLayoutStyle, pinnedClasses } from './cellStyle';
import { useGridContext } from './gridContext';

type GridHeaderType<Row extends RowData> = Header<GridFeatures, Row, unknown>;

interface GridHeaderCellProps<Row extends RowData> {
  header: GridHeaderType<Row>;
  colIndex: number;
  /** Whether this is the header cell that holds the grid's tab stop. */
  active: boolean;
  /** The last unpinned column grows to fill a grid that is wider than its columns. */
  grow: boolean;
  /** The number of sorted columns, to show an order badge only for a multi-column sort. */
  sortCount: number;
}

function GridHeaderCell<Row extends RowData>({
  header,
  colIndex,
  active,
  grow,
  sortCount,
}: GridHeaderCellProps<Row>) {
  const { columnsById, onCellFocus } = useGridContext<Row>();
  const column = header.column;
  const definition = columnsById.get(column.id);
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const toggleSort = column.getToggleSortingHandler();
  const align = definition?.align ?? 'start';

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !toggleSort) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Shift+Enter adds the column to the sort, like Shift+click.
      toggleSort(event);
    }
  };

  return (
    <div
      role="columnheader"
      aria-colindex={colIndex + 1}
      aria-sort={
        canSort
          ? sorted === 'asc'
            ? 'ascending'
            : sorted === 'desc'
              ? 'descending'
              : 'none'
          : undefined
      }
      aria-label={definition?.renderHeader ? definition.header : undefined}
      tabIndex={active ? 0 : -1}
      data-grid-cell=""
      data-grid-row={0}
      data-grid-col={colIndex}
      data-column-id={column.id}
      className={cx(
        'axon-datagrid__cell',
        'axon-datagrid__header-cell',
        `axon-datagrid__cell--${align}`,
        canSort && 'axon-datagrid__header-cell--sortable',
        sorted && 'axon-datagrid__header-cell--sorted',
        ...pinnedClasses(column),
      )}
      style={cellLayoutStyle(column, grow)}
      onFocus={() => onCellFocus(0, colIndex)}
      onClick={toggleSort}
      onKeyDown={onKeyDown}
    >
      <span className="axon-datagrid__header-title">
        {definition?.renderHeader ? definition.renderHeader(definition) : definition?.header}
      </span>
      {canSort ? (
        <SortIcon
          className="axon-datagrid__sort-icon axon-sort-icon"
          data-sort={sorted || 'none'}
        />
      ) : null}
      {sorted && sortCount > 1 ? (
        <span className="axon-datagrid__sort-order" aria-hidden="true">
          {column.getSortIndex() + 1}
        </span>
      ) : null}
    </div>
  );
}

export interface GridHeaderProps<Row extends RowData> {
  headers: GridHeaderType<Row>[];
  /** The column holding the tab stop when it is in the header row, otherwise -1. */
  activeCol: number;
  growColumnId: string | undefined;
  sortCount: number;
  headerRef: Ref<HTMLDivElement>;
}

export function GridHeader<Row extends RowData>({
  headers,
  activeCol,
  growColumnId,
  sortCount,
  headerRef,
}: GridHeaderProps<Row>) {
  return (
    <div role="rowgroup" className="axon-datagrid__head" ref={headerRef}>
      <div role="row" aria-rowindex={1} className="axon-datagrid__row axon-datagrid__row--header">
        {headers.map((header, index) => (
          <GridHeaderCell
            key={header.id}
            header={header}
            colIndex={index}
            active={activeCol === index}
            grow={header.column.id === growColumnId}
            sortCount={sortCount}
          />
        ))}
      </div>
    </div>
  );
}
