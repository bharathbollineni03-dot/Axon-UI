import type { MouseEvent, ReactNode } from 'react';
import type { Cell, RowData } from '@tanstack/react-table';
import { cx } from '../../internal/cx';
import { formatCellValue } from '../../internal/format';
import type { GridFeatures, GridRow as GridRowType } from '../../internal/features';
import type { DataGridRowProps } from '../../types';
import { cellLayoutStyle, pinnedClasses, type GridColumn } from './cellStyle';
import { useGridContext } from './gridContext';

interface GridCellProps<Row extends RowData> {
  cell: Cell<GridFeatures, Row, unknown>;
  row: GridRowType<Row>;
  column: GridColumn<Row>;
  colIndex: number;
  /** The cell's row in the grid's keyboard model: 1 is the first body row. */
  gridRow: number;
  displayIndex: number;
  active: boolean;
  grow: boolean;
}

function GridCell<Row extends RowData>({
  cell,
  row,
  column,
  colIndex,
  gridRow,
  displayIndex,
  active,
  grow,
}: GridCellProps<Row>) {
  const { columnsById, locale, onCellFocus } = useGridContext<Row>();
  const definition = columnsById.get(column.id);
  const align = definition?.align ?? 'start';

  let content: ReactNode = null;
  if (definition) {
    const value = cell.getValue();
    content = definition.cell ? (
      definition.cell({
        value,
        row: row.original,
        rowId: row.id,
        rowIndex: displayIndex,
        column: definition,
      })
    ) : (
      <span className="axon-datagrid__cell-text">{formatCellValue(value, locale)}</span>
    );
  }

  return (
    <div
      role="gridcell"
      aria-colindex={colIndex + 1}
      tabIndex={active ? 0 : -1}
      data-grid-cell=""
      data-grid-row={gridRow}
      data-grid-col={colIndex}
      data-column-id={column.id}
      className={cx(
        'axon-datagrid__cell',
        `axon-datagrid__cell--${align}`,
        ...pinnedClasses(column),
      )}
      style={cellLayoutStyle(column, grow)}
      onFocus={() => onCellFocus(gridRow, colIndex)}
    >
      {content}
    </div>
  );
}

export interface GridRowProps<Row extends RowData> {
  row: GridRowType<Row>;
  /** Position among the rows drawn, from 0. */
  displayIndex: number;
  /** The row's `aria-rowindex`: its place in the whole data set, header included. */
  ariaRowIndex: number;
  columns: GridColumn<Row>[];
  /** The column holding the tab stop when it is in this row, otherwise -1. */
  activeCol: number;
  growColumnId: string | undefined;
  rowProps?: DataGridRowProps;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export function GridRow<Row extends RowData>({
  row,
  displayIndex,
  ariaRowIndex,
  columns,
  activeCol,
  growColumnId,
  rowProps,
  onClick,
}: GridRowProps<Row>) {
  const { rowHeight } = useGridContext<Row>();
  const cells = row.getVisibleCellsByColumnId();

  return (
    // The row is a pointer shortcut for `onRowClick`; the keyboard reaches the same rows through
    // the cells, which carry the grid's key handling.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      data-row-id={row.id}
      className={cx(
        'axon-datagrid__row',
        displayIndex % 2 === 1 && 'axon-datagrid__row--odd',
        onClick && 'axon-datagrid__row--clickable',
        rowProps?.className,
      )}
      style={{ height: rowHeight, ...rowProps?.style }}
      onClick={onClick}
    >
      {columns.map((column, colIndex) => {
        const cell = cells[column.id];
        if (!cell) return null;
        return (
          <GridCell
            key={column.id}
            cell={cell}
            row={row}
            column={column}
            colIndex={colIndex}
            gridRow={displayIndex + 1}
            displayIndex={displayIndex}
            active={activeCol === colIndex}
            grow={column.id === growColumnId}
          />
        );
      })}
    </div>
  );
}
