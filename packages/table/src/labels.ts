/**
 * Every word the grid says that is not your data: names for controls, empty and error messages, and
 * the sentences announced to screen readers. Pass `labels` with any of them to translate or reword.
 */
export interface DataGridLabels {
  /** The grid's accessible name when you give it neither `aria-label` nor `aria-labelledby`. */
  grid: string;
  loading: string;
  noRows: string;
  loadError: string;
  retry: string;
  /** Announced when the sort changes. `parts` are the sorted columns in priority order. */
  sortedBy: (parts: Array<{ column: string; descending: boolean }>) => string;
  sortCleared: string;
  /** The row count line, e.g. "1,204 rows". */
  rowCount: (count: number) => string;
}

export const defaultDataGridLabels: DataGridLabels = {
  grid: 'Data grid',
  loading: 'Loading data',
  noRows: 'No rows to display',
  loadError: 'The data could not be loaded.',
  retry: 'Try again',
  sortedBy: (parts) =>
    `Sorted by ${parts
      .map((part) => `${part.column} ${part.descending ? 'descending' : 'ascending'}`)
      .join(', then ')}`,
  sortCleared: 'Sorting removed',
  rowCount: (count) => `${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`,
};
