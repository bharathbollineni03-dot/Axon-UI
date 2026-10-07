import { createContext, useContext, type ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridLabels } from '../../labels';
import type { DataGridColumn, DataGridRowUpdate } from '../../types';
import type { GridTable } from '../../internal/features';

/** A column being dragged to a new place: which one, and the edge of which column it would land on. */
export interface ColumnDragState {
  sourceId: string;
  targetId: string | null;
  side: 'before' | 'after';
}

/** The cell whose editor is open. */
export interface EditingCell {
  rowId: string;
  columnId: string;
  /** Where the cell is in the keyboard model, so focus can go back to it. */
  gridRow: number;
  col: number;
}

export interface GridContextValue {
  /** A prefix for ids that tie a row to its detail panel. */
  gridId: string;
  /** The width of the scrolling area; a detail panel is as wide as that, not as the whole row. */
  viewportWidth: number;
  /** The table, with its row type erased; `useGridContext<Row>()` puts it back. */
  table: GridTable<RowData>;
  labels: DataGridLabels;
  locale: string | undefined;
  columnsById: ReadonlyMap<string, DataGridColumn<unknown>>;
  rowHeight: number;
  /** Tells the navigation which cell has focus. */
  onCellFocus: (row: number, col: number) => void;
  /** Whether rows can open, which makes the grid a tree grid. */
  treegrid: boolean;
  /** Says something to screen readers. */
  announce: (message: string) => void;

  // Editing
  editing: EditingCell | null;
  startEdit: (cell: EditingCell) => void;
  /** Closes the editor and puts focus back on its cell. */
  stopEdit: () => void;
  /** Saves an edit; undefined when the grid was not given `onRowUpdate`, so no cell is editable. */
  updateRow: ((change: DataGridRowUpdate<unknown>) => void | Promise<void>) | undefined;

  // Detail panels
  renderDetail: ((row: unknown) => ReactNode) | undefined;

  // Moving columns
  drag: ColumnDragState | null;
  setDrag: (drag: ColumnDragState | null) => void;
  canReorder: (columnId: string) => boolean;
  /** Puts a column before or after another. */
  reorderColumn: (columnId: string, targetId: string, side: 'before' | 'after') => void;
  /** Moves a column one place over among the columns that are shown. */
  moveColumn: (columnId: string, delta: -1 | 1) => void;
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
