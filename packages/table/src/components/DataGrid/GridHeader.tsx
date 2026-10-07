import type { DragEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import { Checkbox } from '@axon/core';
import type { Header, RowData } from '@tanstack/react-table';
import { EXPAND_COLUMN_ID, SELECT_COLUMN_ID } from '../../internal/buildColumns';
import { cx } from '../../internal/cx';
import { SortIcon } from '../../internal/icons';
import type { GridFeatures } from '../../internal/features';
import { cellLayoutStyle, pinnedClasses } from './cellStyle';
import { ColumnMenu } from './ColumnMenu';
import { useGridContext } from './gridContext';

type GridHeaderType<Row extends RowData> = Header<GridFeatures, Row, unknown>;

/** A key press on the resize handle moves the edge this far; with Shift, further. */
const RESIZE_STEP = 10;
const RESIZE_STEP_LARGE = 50;

interface GridHeaderCellProps<Row extends RowData> {
  header: GridHeaderType<Row>;
  colIndex: number;
  /** Whether this is the header cell that holds the grid's tab stop. */
  active: boolean;
  /** The last unpinned column grows to fill a grid that is wider than its columns. */
  grow: boolean;
  /** The number of sorted columns, to show an order badge only for a multi-column sort. */
  sortCount: number;
  /** Whether the grid has a menu of tools for each column. */
  columnMenus: boolean;
}

function GridHeaderCell<Row extends RowData>({
  header,
  colIndex,
  active,
  grow,
  sortCount,
  columnMenus,
}: GridHeaderCellProps<Row>) {
  const {
    table,
    labels,
    columnsById,
    onCellFocus,
    drag,
    setDrag,
    canReorder,
    reorderColumn,
    moveColumn,
  } = useGridContext<Row>();
  const column = header.column;
  const definition = columnsById.get(column.id);
  const isSelect = column.id === SELECT_COLUMN_ID;
  const isUtility = isSelect || column.id === EXPAND_COLUMN_ID;
  const title = isSelect
    ? labels.selectColumn
    : isUtility
      ? labels.expandColumn
      : (definition?.header ?? column.id);
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const toggleSort = column.getToggleSortingHandler();
  const align = definition?.align ?? 'start';
  const reorderable = canReorder(column.id);
  const canResize = column.getCanResize();
  const resizeHandler = header.getResizeHandler();

  const dragging = drag?.sourceId === column.id;
  const dropSide = drag && drag.targetId === column.id && !dragging ? drag.side : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.altKey && reorderable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      moveColumn(column.id, event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isSelect) {
      event.preventDefault();
      table.toggleAllPageRowsSelected();
    } else if (toggleSort) {
      event.preventDefault();
      // Shift+Enter adds the column to the sort, like Shift+click.
      toggleSort(event);
    }
  };

  const onResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP;
    const delta = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
    if (delta === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const min = column.columnDef.minSize ?? 0;
    const max = column.columnDef.maxSize ?? Number.POSITIVE_INFINITY;
    const next = Math.min(max, Math.max(min, column.getSize() + delta));
    table.setColumnSizing((previous) => ({ ...previous, [column.id]: next }));
  };

  // Dragging a header to another place -------------------------------------------------------------

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    // Firefox starts no drag without some data.
    event.dataTransfer?.setData('text/plain', column.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    setDrag({ sourceId: column.id, targetId: null, side: 'before' });
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!drag || !reorderable || drag.sourceId === column.id) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const side = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    if (drag.targetId !== column.id || drag.side !== side) {
      setDrag({ sourceId: drag.sourceId, targetId: column.id, side });
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!drag || !reorderable || drag.sourceId === column.id) return;
    event.preventDefault();
    reorderColumn(drag.sourceId, column.id, drag.side);
    setDrag(null);
  };

  const sizeMax = column.columnDef.maxSize;

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
      // Named outright, so the names of the menu button and resize handle inside are not part of it.
      aria-label={title}
      tabIndex={active ? 0 : -1}
      draggable={reorderable || undefined}
      data-grid-cell=""
      data-grid-row={0}
      data-grid-col={colIndex}
      data-column-id={column.id}
      className={cx(
        'axon-datagrid__cell',
        'axon-datagrid__header-cell',
        `axon-datagrid__cell--${align}`,
        isUtility && 'axon-datagrid__cell--utility',
        canSort && 'axon-datagrid__header-cell--sortable',
        sorted && 'axon-datagrid__header-cell--sorted',
        dragging && 'axon-datagrid__header-cell--dragging',
        dropSide && `axon-datagrid__header-cell--drop-${dropSide}`,
        ...pinnedClasses(column),
      )}
      style={cellLayoutStyle(column, grow)}
      onFocus={() => onCellFocus(0, colIndex)}
      onClick={toggleSort}
      onKeyDown={onKeyDown}
      onDragStart={reorderable ? onDragStart : undefined}
      onDragOver={reorderable ? onDragOver : undefined}
      onDrop={reorderable ? onDrop : undefined}
      onDragEnd={reorderable ? () => setDrag(null) : undefined}
    >
      {isSelect ? (
        <Checkbox
          size="sm"
          aria-label={labels.selectAllPage}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          // A click on the checkbox must not also reach the header, which sorts.
          onClick={(event) => event.stopPropagation()}
          tabIndex={active ? 0 : -1}
        />
      ) : isUtility ? (
        <span className="axon-visually-hidden">{title}</span>
      ) : (
        <span className="axon-datagrid__header-title">
          {definition?.renderHeader ? definition.renderHeader(definition) : definition?.header}
        </span>
      )}
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
      {columnMenus && !isUtility ? <ColumnMenu column={column} active={active} /> : null}
      {canResize ? (
        // A separator that can take focus and has a value is the WAI-ARIA "window splitter" widget:
        // arrow keys move it, and `aria-valuenow` is the column's width.
        /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={labels.resizeColumn(title)}
          aria-valuenow={column.getSize()}
          aria-valuemin={column.columnDef.minSize}
          aria-valuemax={sizeMax !== undefined && sizeMax < 100000 ? sizeMax : undefined}
          tabIndex={active ? 0 : -1}
          draggable={false}
          className={cx(
            'axon-datagrid__resizer',
            column.getIsResizing() && 'axon-datagrid__resizer--active',
          )}
          onMouseDown={(event) => {
            // No text selection, and no drag of the header, while the edge is being pulled.
            event.preventDefault();
            event.stopPropagation();
            resizeHandler(event);
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
            resizeHandler(event);
          }}
          // Letting go over the handle is a click that would otherwise sort the column.
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation();
            column.resetSize();
          }}
          onKeyDown={onResizeKeyDown}
        />
      ) : /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
      null}
    </div>
  );
}

export interface GridHeaderProps<Row extends RowData> {
  headers: GridHeaderType<Row>[];
  /** The column holding the tab stop when it is in the header row, otherwise -1. */
  activeCol: number;
  growColumnId: string | undefined;
  sortCount: number;
  columnMenus: boolean;
  headerRef: Ref<HTMLDivElement>;
  /** More rows that belong to the sticky header, such as the filters. */
  children?: ReactNode;
}

export function GridHeader<Row extends RowData>({
  headers,
  activeCol,
  growColumnId,
  sortCount,
  columnMenus,
  headerRef,
  children,
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
            columnMenus={columnMenus}
          />
        ))}
      </div>
      {children}
    </div>
  );
}
