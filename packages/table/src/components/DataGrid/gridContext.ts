import { createContext, useContext } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridLabels } from '../../labels';
import type { DataGridColumn } from '../../types';
import type { GridTable } from '../../internal/features';

export interface GridContextValue {
  /** The table, with its row type erased; `useGridContext<Row>()` puts it back. */
  table: GridTable<RowData>;
  labels: DataGridLabels;
  locale: string | undefined;
  columnsById: ReadonlyMap<string, DataGridColumn<unknown>>;
  rowHeight: number;
  /** Tells the navigation which cell has focus. */
  onCellFocus: (row: number, col: number) => void;
}

export const GridContext = createContext<GridContextValue | null>(null);

export function useGridContext<Row extends RowData>() {
  const context = useContext(GridContext);
  if (!context) throw new Error('DataGrid parts must be rendered inside a DataGrid.');
  return context as unknown as Omit<GridContextValue, 'table' | 'columnsById'> & {
    table: GridTable<Row>;
    columnsById: ReadonlyMap<string, DataGridColumn<Row>>;
  };
}
