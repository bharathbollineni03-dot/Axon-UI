import type { DataGridDensity } from './types';

/**
 * Every word the grid says that is not your data: names for controls, empty and error messages, and
 * the sentences announced to screen readers. Pass `labels` with any of them to translate or reword.
 */
export interface DataGridLabels {
  /** The grid's accessible name when you give it neither `aria-label` nor `aria-labelledby`. */
  grid: string;
  loading: string;
  noRows: string;
  /** Shown instead of `noRows` when the filters or the search have removed every row. */
  noMatches: string;
  loadError: string;
  retry: string;
  /** Announced when the sort changes. `parts` are the sorted columns in priority order. */
  sortedBy: (parts: Array<{ column: string; descending: boolean }>) => string;
  sortCleared: string;
  /** The row count line, e.g. "1,204 rows". */
  rowCount: (count: number) => string;

  // Toolbar
  toolbar: string;
  search: string;
  searchPlaceholder: string;
  clearSearch: string;
  filters: string;
  /** The Filters button when some filters are on, e.g. "Filters (2)". */
  filtersActive: (count: number) => string;
  clearFilters: string;
  density: string;
  densities: Record<DataGridDensity, string>;

  // Column filters
  filterColumn: (column: string) => string;
  filterPlaceholder: string;
  filterMin: (column: string) => string;
  filterMax: (column: string) => string;
  filterFrom: (column: string) => string;
  filterTo: (column: string) => string;
  filterAll: string;
  filterRow: string;

  // Selection
  /** The name of the checkbox column. */
  selectColumn: string;
  selectAllPage: string;
  selectAllRows: string;
  selectRow: (rowLabel: string) => string;
  /** Announced and shown when the selection changes. */
  selectedCount: (count: number) => string;
  /** The bulk bar's button that selects every row, beyond the page. */
  selectAllN: (count: number) => string;
  clearSelection: string;
  selectionActions: string;

  // Columns
  columnsMenu: string;
  resetLayout: string;
  /** The name of a column's menu button. */
  columnMenu: (column: string) => string;
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  hideColumn: string;
  moveLeft: string;
  moveRight: string;
  resizeColumn: (column: string) => string;
  /** Announced after a column is moved. */
  columnMoved: (column: string, position: number, total: number) => string;

  // Export
  exportCsv: string;
  exported: (count: number) => string;

  // Pagination
  pagination: string;
  rowsPerPage: string;
  /** "1–25 of 1,204" */
  pageRange: (from: number, to: number, total: number) => string;
  /** Announced when the page changes. */
  pageOf: (page: number, pageCount: number) => string;
}

export const defaultDataGridLabels: DataGridLabels = {
  grid: 'Data grid',
  loading: 'Loading data',
  noRows: 'No rows to display',
  noMatches: 'No rows match your filters',
  loadError: 'The data could not be loaded.',
  retry: 'Try again',
  sortedBy: (parts) =>
    `Sorted by ${parts
      .map((part) => `${part.column} ${part.descending ? 'descending' : 'ascending'}`)
      .join(', then ')}`,
  sortCleared: 'Sorting removed',
  rowCount: (count) => `${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`,

  toolbar: 'Data grid tools',
  search: 'Search',
  searchPlaceholder: 'Search…',
  clearSearch: 'Clear search',
  filters: 'Filters',
  filtersActive: (count) => `Filters (${count})`,
  clearFilters: 'Clear filters',
  density: 'Density',
  densities: { compact: 'Compact', standard: 'Standard', comfortable: 'Comfortable' },

  filterColumn: (column) => `Filter ${column}`,
  filterPlaceholder: 'Filter…',
  filterMin: (column) => `${column}, minimum`,
  filterMax: (column) => `${column}, maximum`,
  filterFrom: (column) => `${column}, from`,
  filterTo: (column) => `${column}, to`,
  filterAll: 'All',
  filterRow: 'Column filters',

  selectColumn: 'Select',
  selectAllPage: 'Select all rows on this page',
  selectAllRows: 'Select all rows',
  selectRow: (rowLabel) => `Select ${rowLabel}`,
  selectedCount: (count) => `${count.toLocaleString()} selected`,
  selectAllN: (count) => `Select all ${count.toLocaleString()} rows`,
  clearSelection: 'Clear selection',
  selectionActions: 'Selection actions',

  columnsMenu: 'Columns',
  resetLayout: 'Reset columns',
  columnMenu: (column) => `${column} column menu`,
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  hideColumn: 'Hide column',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  resizeColumn: (column) => `Resize ${column}`,
  columnMoved: (column, position, total) => `${column} moved to position ${position} of ${total}`,

  exportCsv: 'Export CSV',
  exported: (count) => `Exported ${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`,

  pagination: 'Pagination',
  rowsPerPage: 'Rows per page',
  pageRange: (from, to, total) =>
    `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`,
  pageOf: (page, pageCount) => `Page ${page.toLocaleString()} of ${pageCount.toLocaleString()}`,
};
