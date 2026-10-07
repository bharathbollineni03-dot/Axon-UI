import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridLabels } from '../../labels';
import type {
  DataGridColumn,
  DataGridColumnFilters,
  DataGridDensity,
  DataGridLayout,
  DataGridPaginationState,
  DataGridQueryState,
  DataGridExpanded,
  DataGridExportContext,
  DataGridGrouping,
  DataGridRowProps,
  DataGridRowSelection,
  DataGridRowUpdate,
  DataGridSelectionContext,
  DataGridSortingState,
  DataGridToolbarOptions,
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

  // Columns

  /** Lets the user drag the edges of headers to resize columns. Default true. */
  resizable?: boolean;
  /** Lets the user drag headers (or press Alt+arrow keys on one) to reorder columns. Default true. */
  reorderable?: boolean;
  /** Gives each header a menu to sort, pin, move and hide the column. Default true. */
  columnMenus?: boolean;

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

  // Filtering

  /** The filters on columns, when you hold them yourself. Pair with `onColumnFiltersChange`. */
  columnFilters?: DataGridColumnFilters;
  defaultColumnFilters?: DataGridColumnFilters;
  onColumnFiltersChange?: (filters: DataGridColumnFilters) => void;
  /** The toolbar's search text. */
  globalFilter?: string;
  defaultGlobalFilter?: string;
  onGlobalFilterChange?: (text: string) => void;
  /** How long to wait after typing before filtering, in milliseconds. Default 200. */
  filterDebounce?: number;
  /** Whether the row of column filters starts open. */
  defaultShowFilters?: boolean;

  // Pagination

  /** Splits the rows into pages with controls under the grid. */
  paginated?: boolean;
  /** The page, when you hold it yourself. Pair with `onPaginationChange`. */
  pagination?: DataGridPaginationState;
  /** The page and page size to start with. Default: the first page of 25. */
  defaultPagination?: DataGridPaginationState;
  onPaginationChange?: (pagination: DataGridPaginationState) => void;
  /** The page sizes offered. Default `[10, 25, 50, 100]`. */
  pageSizeOptions?: number[];

  // Server mode

  /**
   * `'client'` (the default) sorts, filters and pages the `data` you give it. `'server'` leaves all
   * three to you: `data` is already the current page, in order, and `onStateChange` says what to
   * ask for.
   */
  mode?: 'client' | 'server';
  /** In server mode, how many rows match the query across all pages. */
  totalRowCount?: number;
  /**
   * Called when the page, sort, column filters or search change (not on first render) with
   * everything a server needs to answer. Search and text filters are debounced first.
   */
  onStateChange?: (state: DataGridQueryState) => void;

  // Selection

  /** Adds a column of checkboxes. */
  selectable?: boolean;
  /** The selected rows by id, when you hold them yourself. Pair with `onRowSelectionChange`. */
  rowSelection?: DataGridRowSelection;
  defaultRowSelection?: DataGridRowSelection;
  onRowSelectionChange?: (selection: DataGridRowSelection) => void;
  /** Rows for which this returns false cannot be selected. */
  isRowSelectable?: (row: Row) => boolean;
  /** Content for the bar that appears while rows are selected: buttons that act on them. */
  bulkActions?: (selection: DataGridSelectionContext<Row>) => ReactNode;

  // Expanding and grouping

  /**
   * Draws a panel under a row when it is opened, and adds a column with the button that opens it.
   * Keep its height to what its content needs; a virtualized grid measures it.
   */
  renderDetailPanel?: (row: Row) => ReactNode;
  /** Rows for which this returns false have no detail panel. Default: every row has one. */
  getRowCanExpand?: (row: Row) => boolean;
  /** Which rows are open (detail panels, and the groups when grouped), when you hold it yourself. */
  expanded?: DataGridExpanded;
  defaultExpanded?: DataGridExpanded;
  onExpandedChange?: (expanded: DataGridExpanded) => void;
  /** About how tall a detail panel is, in pixels, so that a virtualized grid can guess before it measures. Default 160. */
  detailPanelHeight?: number;
  /** The ids of the columns to group rows by, when you hold them yourself. */
  grouping?: DataGridGrouping;
  defaultGrouping?: DataGridGrouping;
  onGroupingChange?: (grouping: DataGridGrouping) => void;

  // Editing

  /**
   * Called when the user finishes editing a cell. Return a promise to keep the editor open and busy
   * while the change is saved; if it rejects, its message is shown and the editor stays open. Update
   * your `data` here: the grid shows what `data` says.
   */
  onRowUpdate?: (change: DataGridRowUpdate<Row>) => void | Promise<void>;

  // Infinite scroll

  /**
   * Called when the reader scrolls near the end of the rows (or the rows do not fill the grid) and
   * `hasMore` is true: fetch the next rows and add them to `data`. Use it instead of `paginated`.
   * It is called once for each number of rows.
   */
  onLoadMore?: () => void;
  /** Whether there are more rows to fetch. Without it `onLoadMore` is never called. */
  hasMore?: boolean;
  /** Shows a loading line at the end while the next rows are on their way. */
  loadingMore?: boolean;
  /** How many rows from the end to start fetching. Default 8. */
  loadMoreThreshold?: number;

  // Export

  /** The name of the file the toolbar's export button saves. Default `export.csv`. */
  exportFileName?: string;
  /** Takes over from the download: do something else with the CSV, such as ask a server for all rows. */
  onExport?: (context: DataGridExportContext<Row>) => void;

  // Toolbar

  /** Shows a toolbar of tools above the grid: `true` for all of them, or choose which. */
  toolbar?: boolean | DataGridToolbarOptions;
  /** A title or other content at the start of the toolbar. */
  toolbarStart?: ReactNode;
  /** Extra buttons at the end of the toolbar. */
  toolbarEnd?: ReactNode;

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
