import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Checkbox } from '@axon/core';
import type { Cell, RowData } from '@tanstack/react-table';
import { EXPAND_COLUMN_ID, SELECT_COLUMN_ID } from '../../internal/buildColumns';
import { cx } from '../../internal/cx';
import { formatCellValue } from '../../internal/format';
import { ChevronRightIcon } from '../../internal/icons';
import { leafRows } from '../../internal/rows';
import type { GridFeatures, GridRow as GridRowType } from '../../internal/features';
import type { DataGridColumn, DataGridRowProps } from '../../types';
import { cellLayoutStyle, pinnedClasses, type GridColumn } from './cellStyle';
import { CellEditor, CheckboxEditor, resolveEditor } from './CellEditor';
import { useGridContext } from './gridContext';

/** Aggregations whose result is a value of the column's own kind, so its renderer suits it. */
const SAME_KIND_AGGREGATES = new Set(['sum', 'mean', 'median', 'min', 'max']);

interface GridCellProps<Row extends RowData> {
  cell: Cell<GridFeatures, Row, unknown>;
  row: GridRowType<Row>;
  column: GridColumn<Row>;
  colIndex: number;
  /** The cell's row in the keyboard model: 1 is the first body row. */
  gridRow: number;
  displayIndex: number;
  active: boolean;
  grow: boolean;
  /** What to call the row in the name of its checkbox. */
  rowLabel: string;
  /** For a group row: whether this cell carries the group's name and its open/close button. */
  carriesGroupLabel: boolean;
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
  carriesGroupLabel,
}: GridCellProps<Row>) {
  const {
    gridId,
    columnsById,
    locale,
    labels,
    onCellFocus,
    editing,
    startEdit,
    stopEdit,
    updateRow,
  } = useGridContext<Row>();
  const definition = columnsById.get(column.id);
  const align = definition?.align ?? 'start';
  const isSelect = column.id === SELECT_COLUMN_ID;
  const isExpand = column.id === EXPAND_COLUMN_ID;
  const grouped = row.getIsGrouped();
  const canToggle = row.getCanExpand();

  const value = grouped || !definition ? undefined : cell.getValue();
  const editor = !grouped && updateRow ? resolveEditor(definition?.editable, value) : null;
  const editingHere = editing?.rowId === row.id && editing.columnId === column.id;

  const save = (next: unknown) =>
    updateRow?.({
      rowId: row.id,
      row: row.original,
      columnId: column.id,
      value: next,
      previousValue: value,
    });
  const beginEdit = () => {
    if (editor && editor.type !== 'checkbox') {
      startEdit({ rowId: row.id, columnId: column.id, gridRow, col: colIndex });
    }
  };

  let content: ReactNode = null;
  if (isSelect) {
    content = grouped ? null : (
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
  } else if (isExpand) {
    content =
      !grouped && canToggle ? (
        <button
          type="button"
          className="axon-datagrid__toggle"
          aria-expanded={row.getIsExpanded()}
          aria-controls={row.getIsExpanded() ? `${gridId}-detail-${row.id}` : undefined}
          aria-label={row.getIsExpanded() ? labels.collapseRow : labels.expandRow}
          tabIndex={active ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            row.toggleExpanded();
          }}
        >
          <ChevronRightIcon className="axon-datagrid__chevron" />
        </button>
      ) : null;
  } else if (grouped) {
    if (carriesGroupLabel) {
      // The group's key is text; the value in its first row has the real type (a date, a yes/no).
      const text = formatCellValue(
        row.groupingColumnId ? row.getValue(row.groupingColumnId) : row.groupingValue,
        locale,
      );
      const count = leafRows(row.subRows).length;
      content = (
        <button
          type="button"
          className="axon-datagrid__toggle axon-datagrid__group-label"
          style={{ marginInlineStart: row.depth * 20 }}
          aria-expanded={row.getIsExpanded()}
          tabIndex={active ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            row.toggleExpanded();
          }}
        >
          <ChevronRightIcon className="axon-datagrid__chevron" />
          <span className="axon-datagrid__cell-text">{labels.groupLabel(text, count)}</span>
        </button>
      );
    } else if (definition?.aggregate && !cell.getIsPlaceholder()) {
      const aggregated = cell.getValue();
      const rows = leafRows(row.subRows);
      const useCell =
        typeof definition.aggregate === 'string' && SAME_KIND_AGGREGATES.has(definition.aggregate);
      content = definition.aggregatedCell ? (
        definition.aggregatedCell({ value: aggregated, rows, column: definition })
      ) : useCell && definition.cell ? (
        definition.cell({
          value: aggregated,
          row: row.original,
          rowId: row.id,
          rowIndex: displayIndex,
          column: definition,
        })
      ) : (
        <span className="axon-datagrid__cell-text">
          {Array.isArray(aggregated) && definition.aggregate === 'extent'
            ? aggregated.map((end) => formatCellValue(end, locale)).join(' – ')
            : formatCellValue(aggregated, locale)}
        </span>
      );
    }
  } else if (definition) {
    if (editor?.type === 'checkbox') {
      content = (
        <CheckboxEditor
          definition={definition}
          row={row.original}
          value={value}
          labels={labels}
          tabIndex={active ? 0 : -1}
          save={save}
        />
      );
    } else if (editingHere && editor) {
      content = (
        <CellEditor
          definition={definition}
          editor={editor}
          row={row.original}
          value={value}
          labels={labels}
          locale={locale}
          save={save}
          close={stopEdit}
        />
      );
    } else {
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
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (isSelect) {
      // Space on the cell itself (not on the checkbox, which handles its own) toggles the row.
      if (event.key === ' ' && row.getCanSelect()) {
        event.preventDefault();
        row.toggleSelected();
      }
    } else if (isExpand || (grouped && carriesGroupLabel)) {
      if ((event.key === 'Enter' || event.key === ' ') && canToggle) {
        event.preventDefault();
        row.toggleExpanded();
      }
    } else if (editor?.type === 'checkbox') {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        void Promise.resolve(save(value !== true)).catch(() => {});
      }
    } else if (editor && !editingHere && (event.key === 'Enter' || event.key === 'F2')) {
      event.preventDefault();
      beginEdit();
    }
  };

  return (
    <div
      role="gridcell"
      aria-colindex={colIndex + 1}
      aria-readonly={editor ? false : undefined}
      tabIndex={active ? 0 : -1}
      data-grid-cell=""
      data-grid-row={gridRow}
      data-grid-col={colIndex}
      data-column-id={column.id}
      className={cx(
        'axon-datagrid__cell',
        `axon-datagrid__cell--${align}`,
        (isSelect || isExpand) && 'axon-datagrid__cell--utility',
        editor && editor.type !== 'checkbox' && 'axon-datagrid__cell--editable',
        editingHere && 'axon-datagrid__cell--editing',
        ...pinnedClasses(column),
      )}
      style={cellLayoutStyle(column, grow)}
      onFocus={() => onCellFocus(gridRow, colIndex)}
      onKeyDown={onKeyDown}
      onDoubleClick={editor && !editingHere ? beginEdit : undefined}
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
  const { rowHeight, columnsById, locale, gridId, viewportWidth, renderDetail, treegrid } =
    useGridContext<Row>();
  const cells = row.getVisibleCellsByColumnId();
  const selectable = columns.some((column) => column.id === SELECT_COLUMN_ID);
  const grouped = row.getIsGrouped();
  const selected = selectable && !grouped && row.getIsSelected();
  const expandable = row.getCanExpand();
  const detailOpen = !grouped && !!renderDetail && row.getIsExpanded();

  // A person using a screen reader chooses a row by what it is: its first column with a value.
  const labelColumn = columns.find(
    (column) =>
      (columnsById.get(column.id) as DataGridColumn<Row> | undefined)?.accessor !== undefined,
  );
  const labelValue = labelColumn ? formatCellValue(row.getValue(labelColumn.id), locale) : '';
  const rowLabel = labelValue || `row ${ariaRowIndex}`;

  // A group row names itself in the cell of the column it groups by, or, when that column is not
  // shown, in the first cell that has a column of the grid's own.
  const labelCellId = grouped
    ? columns.some((column) => column.id === row.groupingColumnId)
      ? row.groupingColumnId
      : columns.find((column) => columnsById.has(column.id))?.id
    : undefined;

  const renderedCells = columns.map((column, colIndex) => {
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
        carriesGroupLabel={column.id === labelCellId}
      />
    );
  });

  return (
    // The row is a pointer shortcut for `onRowClick`; the keyboard reaches the same rows through
    // the cells, which carry the grid's key handling.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-level={treegrid ? row.depth + 1 : undefined}
      aria-selected={selectable && !grouped ? selected : undefined}
      aria-expanded={expandable && (grouped || !!renderDetail) ? row.getIsExpanded() : undefined}
      data-row-id={row.id}
      className={cx(
        'axon-datagrid__row',
        'axon-datagrid__row--body',
        displayIndex % 2 === 1 && 'axon-datagrid__row--odd',
        grouped && 'axon-datagrid__row--group',
        detailOpen && 'axon-datagrid__row--open',
        onClick && !grouped && 'axon-datagrid__row--clickable',
        selected && 'axon-datagrid__row--selected',
        rowProps?.className,
      )}
      style={{ height: detailOpen ? undefined : rowHeight, ...rowProps?.style }}
      onClick={grouped ? undefined : onClick}
    >
      {/* The cells always sit in the same wrapper, so opening a panel does not remount them (and lose focus). */}
      <div role="presentation" className="axon-datagrid__row-main" style={{ height: rowHeight }}>
        {renderedCells}
      </div>
      {detailOpen ? (
        <div
          role="gridcell"
          id={`${gridId}-detail-${row.id}`}
          aria-colindex={1}
          aria-colspan={columns.length}
          className="axon-datagrid__detail"
          style={{ width: viewportWidth || undefined }}
        >
          {renderDetail?.(row.original)}
        </div>
      ) : null}
    </div>
  );
}
