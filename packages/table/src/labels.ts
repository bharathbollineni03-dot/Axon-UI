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

  pagination: 'Pagination',
  rowsPerPage: 'Rows per page',
  pageRange: (from, to, total) =>
    `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`,
  pageOf: (page, pageCount) => `Page ${page.toLocaleString()} of ${pageCount.toLocaleString()}`,
};
