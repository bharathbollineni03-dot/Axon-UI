import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Checkbox } from '@axon/core';
import type { Cell, RowData } from '@tanstack/react-table';
import { SELECT_COLUMN_ID } from '../../internal/buildColumns';
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
  /** What to call the row in the name of its checkbox. */
  rowLabel: string;
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
  rowLabel,
}: GridCellProps<Row>) {
  const { columnsById, locale, labels, onCellFocus } = useGridContext<Row>();
  const isSelect = column.id === SELECT_COLUMN_ID;
  const definition = columnsById.get(column.id);
  const align = definition?.align ?? 'start';

  let content: ReactNode = null;
  if (isSelect) {
    content = (
      <Checkbox
        size="sm"
        aria-label={labels.selectRow(rowLabel)}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        // Shift-click selects the rows in between; the handler reads the click from the event.
        onChange={row.getToggleSelectedHandler()}
        onClick={(event) => event.stopPropagation()}
        tabIndex={active ? 0 : -1}
      />
    );
  } else if (definition) {
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

  // Space on the cell itself (not on the checkbox, which handles its own) toggles the row.
  const onSelectKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.key === ' ' && row.getCanSelect()) {
      event.preventDefault();
      row.toggleSelected();
    }
  };

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
        isSelect && 'axon-datagrid__cell--utility',
        ...pinnedClasses(column),
      )}
      style={cellLayoutStyle(column, grow)}
      onFocus={() => onCellFocus(gridRow, colIndex)}
      onKeyDown={isSelect ? onSelectKeyDown : undefined}
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
  const { rowHeight, columnsById, locale } = useGridContext<Row>();
  const cells = row.getVisibleCellsByColumnId();
  const selectable = columns.some((column) => column.id === SELECT_COLUMN_ID);
  const selected = selectable && row.getIsSelected();
  // A person using a screen reader chooses a row by what it is: its first column with a value.
  const labelColumn = columns.find((column) => columnsById.get(column.id)?.accessor !== undefined);
  const labelValue = labelColumn ? formatCellValue(row.getValue(labelColumn.id), locale) : '';
  const rowLabel = labelValue || `row ${ariaRowIndex}`;

  return (
    // The row is a pointer shortcut for `onRowClick`; the keyboard reaches the same rows through
    // the cells, which carry the grid's key handling.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-selected={selectable ? selected : undefined}
      data-row-id={row.id}
      className={cx(
        'axon-datagrid__row',
        displayIndex % 2 === 1 && 'axon-datagrid__row--odd',
        onClick && 'axon-datagrid__row--clickable',
        selected && 'axon-datagrid__row--selected',
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
            rowLabel={rowLabel}
          />
        );
      })}
    </div>
  );
}
