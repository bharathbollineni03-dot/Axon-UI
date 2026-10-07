import type { HTMLAttributes } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { DataGridProps } from './props';

type DomKey = keyof Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'>;
type OwnKey = Exclude<keyof DataGridProps<RowData>, DomKey>;

/**
 * The props that are the grid's own, not the root element's. Typed as a complete record so that
 * adding a prop to `DataGridProps` without listing it here is a compile error, rather than a prop
 * that leaks into the DOM.
 */
const ownProps: Record<OwnKey, true> = {
  data: true,
  columns: true,
  getRowId: true,
  height: true,
  maxHeight: true,
  rowHeight: true,
  defaultDensity: true,
  striped: true,
  bordered: true,
  hoverable: true,
  layout: true,
  defaultLayout: true,
  onLayoutChange: true,
  resizable: true,
  reorderable: true,
  columnMenus: true,
  virtualize: true,
  virtualizeThreshold: true,
  overscan: true,
  sorting: true,
  defaultSorting: true,
  onSortingChange: true,
  multiSort: true,
  columnFilters: true,
  defaultColumnFilters: true,
  onColumnFiltersChange: true,
  globalFilter: true,
  defaultGlobalFilter: true,
  onGlobalFilterChange: true,
  filterDebounce: true,
  defaultShowFilters: true,
  paginated: true,
  pagination: true,
  defaultPagination: true,
  onPaginationChange: true,
  pageSizeOptions: true,
  mode: true,
  totalRowCount: true,
  onStateChange: true,
  selectable: true,
  rowSelection: true,
  defaultRowSelection: true,
  onRowSelectionChange: true,
  isRowSelectable: true,
  bulkActions: true,
  renderDetailPanel: true,
  getRowCanExpand: true,
  expanded: true,
  defaultExpanded: true,
  onExpandedChange: true,
  detailPanelHeight: true,
  grouping: true,
  defaultGrouping: true,
  onGroupingChange: true,
  onRowUpdate: true,
  exportFileName: true,
  onExport: true,
  toolbar: true,
  toolbarStart: true,
  toolbarEnd: true,
  loading: true,
  loadingRows: true,
  error: true,
  onRetry: true,
  emptyState: true,
  labels: true,
  locale: true,
  onRowClick: true,
  rowProps: true,
};

/** What is left of the props once the grid's own are taken out: for the root element. */
export function pickDomProps<Row extends RowData>(
  props: DataGridProps<Row>,
): Omit<DataGridProps<Row>, OwnKey> {
  const dom: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!(key in ownProps)) dom[key] = (props as unknown as Record<string, unknown>)[key];
  }
  return dom as Omit<DataGridProps<Row>, OwnKey>;
}
