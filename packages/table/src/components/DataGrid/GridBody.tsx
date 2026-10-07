import type { MouseEvent } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { GridRow as GridRowType } from '../../internal/features';
import type { DataGridRowProps } from '../../types';
import type { GridColumn } from './cellStyle';
import { GridRow } from './GridRow';
import type { GridVirtualizer } from './useGridVirtualizer';

export interface GridBodyProps<Row extends RowData> {
  rows: GridRowType<Row>[];
  columns: GridColumn<Row>[];
  /** The body row (from 0) holding the tab stop, or -1 when it is not in the body. */
  activeRow: number;
  activeCol: number;
  growColumnId: string | undefined;
  /** The `aria-rowindex` of the first row: the header rows plus any rows on earlier pages. */
  firstRowIndex: number;
  virtual: GridVirtualizer;
  /** The distance from the top of the scroll area to the first row. */
  scrollMargin: number;
  onRowClick?: (row: Row, event: MouseEvent<HTMLElement>) => void;
  rowProps?: (row: Row, rowId: string) => DataGridRowProps | undefined;
}

export function GridBody<Row extends RowData>({
  rows,
  columns,
  activeRow,
  activeCol,
  growColumnId,
  firstRowIndex,
  virtual,
  scrollMargin,
  onRowClick,
  rowProps,
}: GridBodyProps<Row>) {
  const renderRow = (index: number) => {
    const row = rows[index];
    if (!row) return null;
    return (
      <GridRow
        key={row.id}
        row={row}
        displayIndex={index}
        ariaRowIndex={firstRowIndex + index}
        columns={columns}
        activeCol={activeRow === index ? activeCol : -1}
        growColumnId={growColumnId}
        rowProps={rowProps?.(row.original, row.id)}
        onClick={onRowClick ? (event) => onRowClick(row.original, event) : undefined}
      />
    );
  };

  if (!virtual.items) {
    return (
      <div role="rowgroup" className="axon-datagrid__body">
        {rows.map((_, index) => renderRow(index))}
      </div>
    );
  }

  return (
    <div
      role="rowgroup"
      className="axon-datagrid__body axon-datagrid__body--virtual"
      style={{ height: virtual.totalSize }}
    >
      {virtual.items.map((item) => (
        <div
          key={item.key}
          role="presentation"
          className="axon-datagrid__item"
          data-index={item.index}
          style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
        >
          {renderRow(item.index)}
        </div>
      ))}
    </div>
  );
}
