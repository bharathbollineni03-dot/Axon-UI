import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Alert, Button, Skeleton } from '@axon/core';
import type { RowData } from '@tanstack/react-table';
import { cx } from '../../internal/cx';
import { useAnnouncer } from '../../internal/useAnnouncer';
import { useElementSize } from '../../internal/useElementSize';
import type { DataGridToolbarOptions } from '../../types';
import { cellLayoutStyle, pinnedClasses } from './cellStyle';
import { GridBody } from './GridBody';
import { GridContext, type GridContextValue } from './gridContext';
import { GridFilterRow } from './GridFilterRow';
import { GridHeader } from './GridHeader';
import { GridPagination } from './GridPagination';
import { GridToolbar, type ResolvedToolbar } from './GridToolbar';
import { pickDomProps } from './ownProps';
import type { DataGridProps } from './props';
import { useDataGrid } from './useDataGrid';
import { useGridNavigation } from './useGridNavigation';
import { useGridVirtualizer } from './useGridVirtualizer';

/** How tall a virtualized grid is when it is given neither `height` nor `maxHeight`. */
const DEFAULT_VIRTUAL_HEIGHT = 600;
/** How many placeholder rows a loading grid shows when it is not told. */
const DEFAULT_SKELETON_ROWS = 8;
const MAX_SKELETON_ROWS = 10;
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

function errorMessage(error: ReactNode | Error): ReactNode {
  return error instanceof Error ? error.message : error;
}

function resolveToolbar(
  toolbar: boolean | DataGridToolbarOptions | undefined,
  hasFilterable: boolean,
): ResolvedToolbar | null {
  if (!toolbar) return null;
  const options = toolbar === true ? {} : toolbar;
  return {
    search: options.search ?? true,
    filters: (options.filters ?? true) && hasFilterable,
    density: options.density ?? true,
    columns: options.columns ?? true,
    export: options.export ?? true,
  };
}

function DataGridInner<Row extends RowData>(
  props: DataGridProps<Row>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const {
    height,
    maxHeight,
    striped = false,
    bordered = false,
    hoverable = true,
    virtualize = 'auto',
    virtualizeThreshold = 100,
    overscan = 8,
    loading = false,
    loadingRows,
    error,
    onRetry,
    emptyState,
    locale,
    onRowClick,
    rowProps,
    filterDebounce = 200,
    defaultShowFilters,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    toolbar,
    toolbarStart,
    toolbarEnd,
  } = props;
  const {
    className,
    style,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...domProps
  } = pickDomProps(props);

  const model = useDataGrid(props);
  const {
    table,
    rows,
    labels,
    columnsById,
    density,
    rowHeight,
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    paginated,
    pageCount,
    totalRows,
    server,
  } = model;

  // Columns, in the order they are drawn ----------------------------------------------------------

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const columns = headers.map((header) => header.column);
  const colCount = columns.length;
  const growColumnId = [...columns].reverse().find((column) => !column.getIsPinned())?.id;
  const totalWidth = table.getTotalSize();

  // Filters and the toolbar ------------------------------------------------------------------------

  const hasFilterable = props.columns.some(
    (column) => column.filterable && column.accessor !== undefined,
  );
  const tools = resolveToolbar(toolbar, hasFilterable);
  const [showFilters, setShowFilters] = useState(defaultShowFilters ?? columnFilters.length > 0);
  const showFilterRow = showFilters && hasFilterable;
  const headerRowCount = showFilterRow ? 2 : 1;
  const filtered = columnFilters.length > 0 || globalFilter !== '';
  const clearFilters = useCallback(() => {
    model.setColumnFilters([]);
    model.setGlobalFilter('');
  }, [model]);

  // Measuring and virtualization -------------------------------------------------------------------

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const viewport = useElementSize(scrollRef);
  const header = useElementSize(headerRef);
  const headerHeight = header.height || rowHeight;

  const virtualized =
    virtualize === true || (virtualize === 'auto' && rows.length > virtualizeThreshold);
  const limitedHeight = height === undefined && maxHeight === undefined;
  const effectiveMaxHeight =
    maxHeight ?? (virtualized && limitedHeight ? DEFAULT_VIRTUAL_HEIGHT : undefined);
  const initialHeight =
    typeof height === 'number'
      ? height
      : typeof effectiveMaxHeight === 'number'
        ? effectiveMaxHeight
        : DEFAULT_VIRTUAL_HEIGHT;

  const virtual = useGridVirtualizer({
    count: rows.length,
    enabled: virtualized,
    scrollRef,
    rowHeight,
    extraHeight: () => 0,
    headerHeight,
    overscan,
    initialHeight,
    getKey: (index) => rows[index]?.id ?? String(index),
  });
  const { virtualizer } = virtual;

  // Keyboard navigation ----------------------------------------------------------------------------

  const scrollToRow = useCallback(
    (index: number) => {
      if (virtualized) virtualizer.scrollToIndex(index, { align: 'auto' });
    },
    [virtualized, virtualizer],
  );
  const visibleRows = viewport.height
    ? Math.max(1, Math.floor((viewport.height - headerHeight) / rowHeight) - 1)
    : 10;
  const navigation = useGridNavigation({
    rowCount: rows.length,
    colCount,
    gridRef,
    scrollToRow,
    pageSize: visibleRows,
  });
  const { active } = navigation;

  const context = useMemo<GridContextValue>(
    () => ({
      table: table as GridContextValue['table'],
      labels,
      locale,
      columnsById: columnsById as GridContextValue['columnsById'],
      rowHeight,
      onCellFocus: navigation.onCellFocus,
    }),
    [table, labels, locale, columnsById, rowHeight, navigation.onCellFocus],
  );

  // Announcements ----------------------------------------------------------------------------------

  const [announcement, announce] = useAnnouncer();

  const lastSorting = useRef(sorting);
  useEffect(() => {
    if (lastSorting.current === sorting) return;
    lastSorting.current = sorting;
    if (sorting.length === 0) {
      announce(labels.sortCleared);
      return;
    }
    announce(
      labels.sortedBy(
        sorting.map((entry) => ({
          column: columnsById.get(entry.id)?.header ?? entry.id,
          descending: entry.desc,
        })),
      ),
    );
  }, [sorting, labels, columnsById, announce]);

  // After filtering, say how many rows are left. (A server's answer arrives later, with new data.)
  const lastFilters = useRef({ columnFilters, globalFilter });
  useEffect(() => {
    const last = lastFilters.current;
    if (last.columnFilters === columnFilters && last.globalFilter === globalFilter) return;
    lastFilters.current = { columnFilters, globalFilter };
    if (!server) announce(labels.rowCount(totalRows));
  }, [columnFilters, globalFilter, server, totalRows, labels, announce]);

  const lastPage = useRef(pagination.pageIndex);
  useEffect(() => {
    if (lastPage.current === pagination.pageIndex) return;
    lastPage.current = pagination.pageIndex;
    if (paginated) announce(labels.pageOf(pagination.pageIndex + 1, pageCount));
  }, [pagination.pageIndex, paginated, pageCount, labels, announce]);

  // What the body shows ----------------------------------------------------------------------------

  const status = error ? 'error' : rows.length === 0 ? (loading ? 'loading' : 'empty') : 'ready';
  const skeletonRows =
    loadingRows ??
    (paginated ? Math.min(pagination.pageSize, MAX_SKELETON_ROWS) : DEFAULT_SKELETON_ROWS);

  const rootStyle = {
    '--axon-datagrid-row-height': `${rowHeight}px`,
    '--axon-datagrid-header-height': `${headerHeight}px`,
    ...style,
  } as CSSProperties;

  // The widths of the pinned regions keep a cell that is scrolled to out from under them.
  const viewportStyle = {
    '--axon-datagrid-pin-start': `${table.getStartTotalSize()}px`,
    '--axon-datagrid-pin-end': `${table.getEndTotalSize()}px`,
    ...(height === undefined ? null : { height }),
    ...(effectiveMaxHeight === undefined ? null : { maxHeight: effectiveMaxHeight }),
  } as CSSProperties;

  const statusStyle = { width: viewport.width || undefined };

  return (
    <GridContext.Provider value={context}>
      <div
        ref={ref}
        {...domProps}
        className={cx(
          'axon-datagrid',
          `axon-datagrid--${density}`,
          striped && 'axon-datagrid--striped',
          bordered && 'axon-datagrid--bordered',
          hoverable && 'axon-datagrid--hoverable',
          className,
        )}
        style={rootStyle}
      >
        {tools || toolbarStart || toolbarEnd ? (
          <GridToolbar
            tools={
              tools ?? {
                search: false,
                filters: false,
                density: false,
                columns: false,
                export: false,
              }
            }
            labels={labels}
            start={toolbarStart}
            end={toolbarEnd}
            searchText={globalFilter}
            onSearchChange={model.setGlobalFilter}
            debounce={filterDebounce}
            filtersOpen={showFilterRow}
            onToggleFilters={() => setShowFilters((open) => !open)}
            activeFilterCount={columnFilters.length}
            canClear={filtered}
            onClear={clearFilters}
            density={density}
            onDensityChange={(next) =>
              model.setLayout((previous) => ({ ...previous, density: next }))
            }
          />
        ) : null}
        <div ref={scrollRef} className="axon-datagrid__viewport" style={viewportStyle}>
          {/* Focus lives on the cells (one at a time); the grid only receives their key events. */}
          {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : labels.grid)}
            aria-labelledby={ariaLabelledBy}
            aria-rowcount={totalRows + headerRowCount}
            aria-colcount={colCount}
            aria-busy={loading || undefined}
            className="axon-datagrid__grid"
            style={{ width: totalWidth }}
            onKeyDown={navigation.onKeyDown}
          >
            <GridHeader
              headers={headers}
              activeCol={active.row === 0 ? active.col : -1}
              growColumnId={growColumnId}
              sortCount={sorting.length}
              headerRef={headerRef}
            >
              {showFilterRow ? (
                <GridFilterRow
                  columns={columns}
                  growColumnId={growColumnId}
                  data={props.data}
                  ariaRowIndex={2}
                  debounce={filterDebounce}
                />
              ) : null}
            </GridHeader>
            {status === 'loading' ? (
              <div className="axon-datagrid__skeleton" aria-hidden="true">
                {Array.from({ length: skeletonRows }, (_, index) => (
                  <div key={index} className="axon-datagrid__row" style={{ height: rowHeight }}>
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className={cx('axon-datagrid__cell', ...pinnedClasses(column))}
                        style={cellLayoutStyle(column, column.id === growColumnId)}
                      >
                        {columnsById.has(column.id) ? <Skeleton width="70%" /> : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : status === 'ready' ? (
              <GridBody
                rows={rows}
                columns={columns}
                activeRow={active.row - 1}
                activeCol={active.col}
                growColumnId={growColumnId}
                firstRowIndex={
                  headerRowCount + 1 + (paginated ? pagination.pageIndex * pagination.pageSize : 0)
                }
                virtual={virtual}
                scrollMargin={headerHeight}
                onRowClick={onRowClick}
                rowProps={rowProps}
              />
            ) : null}
          </div>
          {status === 'error' ? (
            <div className="axon-datagrid__status" style={statusStyle}>
              <Alert
                status="danger"
                actions={
                  onRetry ? (
                    <Button size="sm" variant="outline" onClick={onRetry}>
                      {labels.retry}
                    </Button>
                  ) : undefined
                }
              >
                {errorMessage(error) === true ? labels.loadError : errorMessage(error)}
              </Alert>
            </div>
          ) : null}
          {status === 'empty' ? (
            <div className="axon-datagrid__status" style={statusStyle}>
              {filtered ? (
                <div className="axon-datagrid__status-stack">
                  <p className="axon-datagrid__status-text">{labels.noMatches}</p>
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    {labels.clearFilters}
                  </Button>
                </div>
              ) : (
                (emptyState ?? <p className="axon-datagrid__status-text">{labels.noRows}</p>)
              )}
            </div>
          ) : null}
        </div>
        {paginated ? (
          <GridPagination
            labels={labels}
            pagination={pagination}
            pageCount={pageCount}
            totalRows={totalRows}
            pageSizeOptions={pageSizeOptions}
            onChange={model.setPagination}
          />
        ) : null}
        {loading && status !== 'loading' ? (
          <div className="axon-datagrid__progress" aria-hidden="true" />
        ) : null}
        <div role="status" aria-live="polite" aria-atomic="true" className="axon-visually-hidden">
          {announcement}
        </div>
      </div>
    </GridContext.Provider>
  );
}

/**
 * A data grid: typed columns over an array of rows, with sorting, filtering, search, pagination
 * (in the browser or on a server), keyboard navigation following the WAI-ARIA grid pattern, and
 * virtualization for very large data sets.
 */
export const DataGrid = forwardRef(DataGridInner) as <Row extends RowData>(
  props: DataGridProps<Row> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null;
