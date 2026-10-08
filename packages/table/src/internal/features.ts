import {
  aggregationFn_count,
  aggregationFn_extent,
  aggregationFn_max,
  aggregationFn_mean,
  aggregationFn_median,
  aggregationFn_min,
  aggregationFn_sum,
  aggregationFn_unique,
  aggregationFn_uniqueCount,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type AggregationFnDef,
  type Row,
  type RowData,
  type Table,
} from '@tanstack/react-table';
import {
  filterFn_gridDateRange,
  filterFn_gridNumberRange,
  filterFn_gridSearch,
  filterFn_gridSelect,
  filterFn_gridText,
} from './filterFns';
import { sortFn_gridNumber } from './sortFns';

/**
 * The built-in aggregations a column can name. They are widened to the general definition type:
 * some of their result types are not exported by TanStack Table, so a declaration file could not
 * spell them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the registry type TanStack Table itself uses
const aggregationFns: Record<string, AggregationFnDef<any, any, any, any>> = {
  count: aggregationFn_count,
  extent: aggregationFn_extent,
  max: aggregationFn_max,
  mean: aggregationFn_mean,
  median: aggregationFn_median,
  min: aggregationFn_min,
  sum: aggregationFn_sum,
  unique: aggregationFn_unique,
  uniqueCount: aggregationFn_uniqueCount,
};

/**
 * Every feature a `DataGrid` can use, registered once at module level (TanStack Table wants the
 * feature registry to be stable). Prerequisites come before the row models that need them, and the
 * row models run in the order filter, group, sort, expand, paginate.
 */
// The annotations tell a bundler these calls can go when nothing uses the grid (a static `Table` alone
// should not carry TanStack Table with it).
export const gridFeatures = /* @__PURE__ */ tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnGroupingFeature,
  rowAggregationFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortedRowModel: /* @__PURE__ */ createSortedRowModel(),
  filteredRowModel: /* @__PURE__ */ createFilteredRowModel(),
  groupedRowModel: /* @__PURE__ */ createGroupedRowModel(),
  expandedRowModel: /* @__PURE__ */ createExpandedRowModel(),
  paginatedRowModel: /* @__PURE__ */ createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    gridNumber: sortFn_gridNumber,
    text: sortFn_text,
  },
  filterFns: {
    gridText: filterFn_gridText,
    gridSelect: filterFn_gridSelect,
    gridNumberRange: filterFn_gridNumberRange,
    gridDateRange: filterFn_gridDateRange,
    gridSearch: filterFn_gridSearch,
  },
  aggregationFns,
});

export type GridFeatures = typeof gridFeatures;

/** The table and row types the grid's internals pass around; the row data is the consumer's `Row`. */
export type GridTable<Data extends RowData> = Table<GridFeatures, Data>;
export type GridRow<Data extends RowData> = Row<GridFeatures, Data>;
