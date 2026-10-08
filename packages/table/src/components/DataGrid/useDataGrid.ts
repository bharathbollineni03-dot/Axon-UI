import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useControllableState } from '@axon/core';
import {
  useTable,
  type ColumnFiltersState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { defaultDataGridLabels, type DataGridLabels } from '../../labels';
import type { DataGridColumn, DataGridDensity, DataGridLayout } from '../../types';
import {
  buildColumnDefs,
  columnIdOf,
  columnsSignature,
  UTILITY_COLUMN_IDS,
} from '../../internal/buildColumns';
import { gridFeatures, type GridRow, type GridTable } from '../../internal/features';
import { applyUpdater, createInitialLayout, DENSITY_ROW_HEIGHT } from '../../internal/layout';
import type { DataGridProps } from './props';

const NO_SORTING: SortingState = [];
const NO_FILTERS: ColumnFiltersState = [];
const NO_SELECTION: RowSelectionState = {};
const NO_GROUPING: GroupingState = [];
const NO_EXPANDED: ExpandedState = {};
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 25 };

/** The row's own `id` when it has one, otherwise where it sits in the data. */
function defaultRowId(row: unknown, index: number): string {
  if (typeof row === 'object' && row !== null && 'id' in row) {
    const id = (row as { id: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return String(index);
}

export interface DataGridModel<Row extends RowData> {
  table: GridTable<Row>;
  rows: GridRow<Row>[];
  labels: DataGridLabels;
  /** The grid's columns by id. */
  columnsById: ReadonlyMap<string, DataGridColumn<Row>>;
  layout: DataGridLayout;
  setLayout: (next: DataGridLayout | ((previous: DataGridLayout) => DataGridLayout)) => void;
  /** Puts the layout back to how the grid started: the columns' own settings, or the saved layout. */
  resetLayout: () => void;
  selectable: boolean;
  setRowSelection: (
    updater: RowSelectionState | ((previous: RowSelectionState) => RowSelectionState),
  ) => void;
  setGrouping: (updater: GroupingState | ((previous: GroupingState) => GroupingState)) => void;
  density: DataGridDensity;
  rowHeight: number;
  /** Whether the server, not the grid, sorts, filters and pages. */
  server: boolean;
  paginated: boolean;
  pageCount: number;
  /** All the rows there are across every page, after filtering. */
  totalRows: number;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  setGlobalFilter: (updater: Updater<string>) => void;
  setPagination: (
    updater: PaginationState | ((previous: PaginationState) => PaginationState),
  ) => void;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  pagination: PaginationState;
  rowSelection: RowSelectionState;
  expanded: ExpandedState;
  grouping: GroupingState;
}

/**
 * Holds every piece of the grid's state (controlled or not), builds the TanStack table from it and
 * returns what the renderer needs. Rendering lives in the components.
 */
export function useDataGrid<Row extends RowData>(props: DataGridProps<Row>): DataGridModel<Row> {
  const {
    data,
    columns,
    getRowId,
    defaultDensity,
    layout: layoutProp,
    defaultLayout,
    onLayoutChange,
    sorting: sortingProp,
    defaultSorting,
    onSortingChange,
    multiSort = true,
    rowHeight: rowHeightProp,
    columnFilters: columnFiltersProp,
    defaultColumnFilters,
    onColumnFiltersChange,
    globalFilter: globalFilterProp,
    defaultGlobalFilter,
    onGlobalFilterChange,
    paginated = false,
    pagination: paginationProp,
    defaultPagination,
    onPaginationChange,
    mode = 'client',
    totalRowCount,
    onStateChange,
    selectable = false,
    rowSelection: rowSelectionProp,
    defaultRowSelection,
    onRowSelectionChange,
    isRowSelectable,
    resizable = true,
    renderDetailPanel,
    getRowCanExpand,
    expanded: expandedProp,
    defaultExpanded,
    onExpandedChange,
    grouping: groupingProp,
    defaultGrouping,
    onGroupingChange,
  } = props;
  const server = mode === 'server';

  const labels = useMemo(() => ({ ...defaultDataGridLabels, ...props.labels }), [props.labels]);

  // Columns --------------------------------------------------------------------------------------

  const columnsById = useMemo(
    () => new Map(columns.map((column) => [columnIdOf(column), column] as const)),
    [columns],
  );
  const columnsByIdRef = useRef(columnsById);
  columnsByIdRef.current = columnsById;

  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const signature = columnsSignature(columns);
  const expandable = !!renderDetailPanel;
  const columnDefs = useMemo(
    () =>
      buildColumnDefs(columnsRef.current, {
        getColumn: (id) => columnsByIdRef.current.get(id),
        selectable,
        expandable,
      }),
    // The signature stands for the columns' content; see `columnsSignature`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, selectable, expandable],
  );

  // State ----------------------------------------------------------------------------------------

  const [initialLayout] = useState(() =>
    createInitialLayout(columns, defaultLayout, defaultDensity),
  );
  const resizingRef = useRef(false);
  const pendingLayoutRef = useRef<DataGridLayout | null>(null);
  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;
  const emitLayout = useCallback((next: DataGridLayout) => {
    // Resizing changes the layout on every pointer move; tell the owner once, when it lets go.
    if (resizingRef.current) pendingLayoutRef.current = next;
    else onLayoutChangeRef.current?.(next);
  }, []);
  const [layout, setLayout] = useControllableState<DataGridLayout>({
    value: layoutProp,
    defaultValue: initialLayout,
    onChange: emitLayout,
  });

  const [sorting, setSorting] = useControllableState<SortingState>({
    value: sortingProp,
    defaultValue: defaultSorting ?? NO_SORTING,
    onChange: onSortingChange,
  });
  const [columnFilters, setColumnFilters] = useControllableState<ColumnFiltersState>({
    value: columnFiltersProp,
    defaultValue: defaultColumnFilters ?? NO_FILTERS,
    onChange: onColumnFiltersChange,
  });
  const [globalFilter, setGlobalFilter] = useControllableState<string>({
    value: globalFilterProp,
    defaultValue: defaultGlobalFilter ?? '',
    onChange: onGlobalFilterChange,
  });
  const [pagination, setPagination] = useControllableState<PaginationState>({
    value: paginationProp,
    defaultValue: defaultPagination ?? DEFAULT_PAGINATION,
    onChange: onPaginationChange,
  });
  // Whatever changes which rows there are sends the reader back to the first page.
  const firstPage = useCallback(
    () =>
      setPagination((previous) =>
        previous.pageIndex === 0 ? previous : { ...previous, pageIndex: 0 },
      ),
    [setPagination],
  );
  const changeSorting = useCallback(
    (updater: Updater<SortingState>) => {
      setSorting(updater);
      firstPage();
    },
    [setSorting, firstPage],
  );
  const changeColumnFilters = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setColumnFilters(updater);
      firstPage();
    },
    [setColumnFilters, firstPage],
  );
  const changeGlobalFilter = useCallback(
    (updater: Updater<string>) => {
      setGlobalFilter(updater);
      firstPage();
    },
    [setGlobalFilter, firstPage],
  );
  const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>({
    value: rowSelectionProp as RowSelectionState | undefined,
    defaultValue: (defaultRowSelection as RowSelectionState | undefined) ?? NO_SELECTION,
    onChange: onRowSelectionChange,
  });
  const [expanded, setExpanded] = useControllableState<ExpandedState>({
    value: expandedProp,
    defaultValue: defaultExpanded ?? NO_EXPANDED,
    onChange: onExpandedChange,
  });
  const [grouping, setGrouping] = useControllableState<GroupingState>({
    value: groupingProp,
    defaultValue: defaultGrouping ?? NO_GROUPING,
    onChange: onGroupingChange,
  });

  const layoutSlice = useCallback(
    <Key extends 'columnOrder' | 'columnSizing' | 'columnVisibility'>(key: Key) =>
      (updater: Updater<DataGridLayout[Key]>) =>
        setLayout((previous) => ({
          ...previous,
          [key]: applyUpdater(updater, previous[key]),
        })),
    [setLayout],
  );
  const columnPinning = useMemo(
    () => ({
      start: [
        ...UTILITY_COLUMN_IDS.filter((id) => columnDefs.some((def) => def.id === id)),
        ...layout.columnPinning.left,
      ],
      end: layout.columnPinning.right,
    }),
    [columnDefs, layout.columnPinning],
  );

  // The table ------------------------------------------------------------------------------------

  const table = useTable({
    features: gridFeatures,
    columns: columnDefs,
    data: data as Row[],
    getRowId: (row, index) => (getRowId ?? defaultRowId)(row, index),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
      expanded,
      grouping,
      columnOrder: layout.columnOrder,
      columnSizing: layout.columnSizing,
      columnVisibility: layout.columnVisibility,
      columnPinning,
    },
    onSortingChange: changeSorting,
    onColumnFiltersChange: changeColumnFilters,
    onGlobalFilterChange: changeGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onColumnOrderChange: layoutSlice('columnOrder'),
    onColumnSizingChange: layoutSlice('columnSizing'),
    onColumnVisibilityChange: layoutSlice('columnVisibility'),
    onColumnPinningChange: (updater) =>
      setLayout((previous) => {
        const next = applyUpdater(updater, {
          start: previous.columnPinning.left,
          end: previous.columnPinning.right,
        });
        return {
          ...previous,
          columnPinning: {
            left: next.start.filter((id) => !UTILITY_COLUMN_IDS.includes(id)),
            right: next.end,
          },
        };
      }),
    enableRowSelection: (row) =>
      selectable && !row.getIsGrouped() && (isRowSelectable ? isRowSelectable(row.original) : true),
    enableMultiSort: multiSort,
    enableSortingRemoval: true,
    sortDescFirst: false,
    columnResizeMode: 'onChange',
    enableColumnResizing: resizable,
    // Edits replace `data`; that must not collapse open rows or send the user back to page one.
    autoResetPageIndex: false,
    autoResetExpanded: false,
    // A group row opens to show its rows; any other row opens to show its detail panel, if there is one.
    getRowCanExpand: (row) =>
      row.subRows.length > 0 ||
      (!!renderDetailPanel && !row.getIsGrouped() && (getRowCanExpand?.(row.original) ?? true)),
    // Grouped columns stay where they are; a group row labels itself in the cell of its own column.
    groupedColumnMode: false,
    manualGrouping: server,
    // In server mode the server sorts, filters and pages. Without `paginated` there are no pages
    // to cut, which "manual" also means.
    manualSorting: server,
    manualFiltering: server,
    manualPagination: server || !paginated,
    rowCount: server ? totalRowCount : undefined,
    globalFilterFn: 'gridSearch',
    // Each column says through `enableGlobalFilter` whether the search looks in it; by default
    // TanStack Table would look only at columns whose first value is text or a number.
    getColumnCanGlobalFilter: () => true,
  });

  // Tell a server what to ask for, whenever the query changes (not on first render).
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const lastQuery = useRef<string | null>(null);
  useEffect(() => {
    const key = JSON.stringify([pagination, sorting, columnFilters, globalFilter]);
    if (lastQuery.current === null) {
      lastQuery.current = key;
      return;
    }
    if (lastQuery.current === key) return;
    lastQuery.current = key;
    onStateChangeRef.current?.({
      pagination,
      sorting,
      filters: columnFilters,
      globalFilter,
    });
  }, [pagination, sorting, columnFilters, globalFilter]);

  // Fewer rows (after a filter, a delete) can leave the current page past the end.
  const pageCount = paginated ? table.getPageCount() : 1;
  useEffect(() => {
    if (paginated && pageCount > 0 && pagination.pageIndex >= pageCount) {
      setPagination((previous) => ({ ...previous, pageIndex: pageCount - 1 }));
    }
  }, [paginated, pageCount, pagination.pageIndex, setPagination]);

  const resizing = table.state.columnResizing?.isResizingColumn;
  useEffect(() => {
    resizingRef.current = !!resizing;
    if (!resizing && pendingLayoutRef.current) {
      const pending = pendingLayoutRef.current;
      pendingLayoutRef.current = null;
      onLayoutChangeRef.current?.(pending);
    }
  }, [resizing]);

  const rows = table.getRowModel().rows;
  const density = layout.density;
  const rowHeight = rowHeightProp ?? DENSITY_ROW_HEIGHT[density];

  // How many rows there are across all pages, for the counts and the paging controls.
  const totalRows = server
    ? (totalRowCount ?? rows.length)
    : paginated
      ? table.getPrePaginatedRowModel().rows.length
      : rows.length;

  return {
    table: table as unknown as GridTable<Row>,
    rows: rows as GridRow<Row>[],
    labels,
    columnsById,
    layout,
    setLayout,
    resetLayout: () => setLayout(initialLayout),
    selectable,
    setRowSelection,
    setGrouping,
    density,
    rowHeight,
    server,
    paginated,
    pageCount,
    totalRows,
    setColumnFilters: changeColumnFilters,
    setGlobalFilter: changeGlobalFilter,
    setPagination,
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    rowSelection,
    expanded,
    grouping,
  };
}
