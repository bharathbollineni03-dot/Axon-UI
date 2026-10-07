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
  density: DataGridDensity;
  rowHeight: number;
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
  } = props;

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
  const selectable = false;
  const expandable = false;
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
    defaultValue: NO_FILTERS,
  });
  const [globalFilter, setGlobalFilter] = useControllableState<string>({ defaultValue: '' });
  const [pagination, setPagination] = useControllableState<PaginationState>({
    defaultValue: DEFAULT_PAGINATION,
  });
  const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>({
    defaultValue: NO_SELECTION,
  });
  const [expanded, setExpanded] = useControllableState<ExpandedState>({
    defaultValue: NO_EXPANDED,
  });
  const [grouping, setGrouping] = useControllableState<GroupingState>({
    defaultValue: NO_GROUPING,
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
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
    enableMultiSort: multiSort,
    enableSortingRemoval: true,
    sortDescFirst: false,
    columnResizeMode: 'onChange',
    // Edits replace `data`; that must not collapse open rows or send the user back to page one.
    autoResetPageIndex: false,
    autoResetExpanded: false,
    manualPagination: true,
    globalFilterFn: 'gridSearch',
  });

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

  return {
    table: table as unknown as GridTable<Row>,
    rows: rows as GridRow<Row>[],
    labels,
    columnsById,
    layout,
    setLayout,
    density,
    rowHeight,
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    rowSelection,
    expanded,
    grouping,
  };
}
