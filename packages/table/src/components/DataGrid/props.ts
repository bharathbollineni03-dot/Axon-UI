import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridLabels } from '../../labels';
import type {
  DataGridColumn,
  DataGridDensity,
  DataGridLayout,
  DataGridRowProps,
  DataGridSortingState,
} from '../../types';

export interface DataGridProps<Row extends RowData> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange' | 'defaultValue'
> {
  /**
   * The rows. Keep the array's identity stable between renders (state, `useMemo`, a query result):
   * a new array each render makes the grid sort and filter it again each time.
   */
  data: readonly Row[];
  /** The columns. Inline arrays are fine; the grid notices when they actually change. */
  columns: readonly DataGridColumn<Row>[];
  /**
   * A stable identity for a row, used by selection, expansion and keys. Default: the row's `id`
   * property when it has one, otherwise its position in `data`.
   */
  getRowId?: (row: Row, index: number) => string;

  // Appearance

  /** The height of the scrolling area, in pixels or as any CSS length. Without it the grid is as tall as its rows. */
  height?: number | string;
  /** Limits the height of the scrolling area; rows scroll inside it. */
  maxHeight?: number | string;
  /** The height of a row in pixels. Default: set by the density. */
  rowHeight?: number;
  /** The density the grid starts in. Default `'standard'`. */
  defaultDensity?: DataGridDensity;
  striped?: boolean;
  /** Draws lines between all cells, not just between rows. */
  bordered?: boolean;
  /** Highlights the row under the pointer. Default true. */
  hoverable?: boolean;

  // Layout (column order, widths, visibility, pinning, density), the part worth saving

  /** The layout, when you hold it yourself. Pair with `onLayoutChange`. */
  layout?: DataGridLayout;
  /** The layout to start with, for example one you saved earlier. Columns it does not know are ignored. */
  defaultLayout?: Partial<DataGridLayout>;
  /**
   * Called with the whole layout after the user moves, resizes, hides or pins a column or changes the
   * density. While a column is being dragged it waits for the pointer to be released.
   */
  onLayoutChange?: (layout: DataGridLayout) => void;

  // Virtualization

  /**
   * Draws only the rows that are in view, so tens of thousands of rows stay fast. `'auto'` (the
   * default) switches it on above `virtualizeThreshold` rows. A virtualized grid scrolls inside its
   * `height`, or inside 600 pixels when it has neither `height` nor `maxHeight`.
   */
  virtualize?: boolean | 'auto';
  virtualizeThreshold?: number;
  /** How many rows to draw beyond the edges of the view. Default 8. */
  overscan?: number;

  // Sorting

  sorting?: DataGridSortingState;
  defaultSorting?: DataGridSortingState;
  onSortingChange?: (sorting: DataGridSortingState) => void;
  /** Whether holding Shift while choosing a header adds a column to the sort. Default true. */
  multiSort?: boolean;

  // States

  /** Shows placeholder rows while there is nothing to show yet, and marks the grid busy while it reloads. */
  loading?: boolean;
  /** How many placeholder rows to show. Default: the page size, or 8. */
  loadingRows?: number;
  /** A failed load. Shows the message with a retry button when `onRetry` is given. */
  error?: ReactNode | Error;
  onRetry?: () => void;
  /** Replaces the "No rows to display" message. */
  emptyState?: ReactNode;

  // Everything else

  labels?: Partial<DataGridLabels>;
  /** The locale for numbers and dates in cells without a `cell` renderer. */
  locale?: string;
  onRowClick?: (row: Row, event: MouseEvent<HTMLElement>) => void;
  /** Extra class names and styles for a row. */
  rowProps?: (row: Row, rowId: string) => DataGridRowProps | undefined;
}
