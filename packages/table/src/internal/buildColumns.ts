import { constructAggregationFn, type ColumnDef, type RowData } from '@tanstack/react-table';
import type { DataGridColumn, DataGridFilterType, DataGridSortType } from '../types';
import type { GridFeatures } from './features';

export const SELECT_COLUMN_ID = '__select';
export const EXPAND_COLUMN_ID = '__expand';
export const UTILITY_COLUMN_IDS: readonly string[] = [SELECT_COLUMN_ID, EXPAND_COLUMN_ID];

export const DEFAULT_COLUMN_WIDTH = 150;
export const DEFAULT_MIN_COLUMN_WIDTH = 60;
export const UTILITY_COLUMN_WIDTH = 44;

/** A column's id: the one it was given, or its accessor when that is a key. */
export function columnIdOf<Row>(column: DataGridColumn<Row>): string {
  const id = column.id ?? (typeof column.accessor === 'string' ? column.accessor : undefined);
  if (!id) {
    throw new Error(
      `DataGrid: the column "${column.header}" needs an \`id\` (it has no string \`accessor\` to use as one).`,
    );
  }
  return id;
}

export function readAccessor<Row>(column: DataGridColumn<Row>, row: Row): unknown {
  const { accessor } = column;
  if (accessor === undefined) return undefined;
  const value =
    typeof accessor === 'function' ? accessor(row) : (row as Record<string, unknown>)[accessor];
  // `null` and `undefined` are both "no value", and the sorting treats both as such.
  return value ?? undefined;
}

const filterFnNames: Record<DataGridFilterType, string> = {
  text: 'gridText',
  select: 'gridSelect',
  'number-range': 'gridNumberRange',
  'date-range': 'gridDateRange',
};

const sortFnNames: Record<DataGridSortType, string> = {
  auto: 'auto',
  text: 'text',
  alphanumeric: 'alphanumeric',
  number: 'gridNumber',
  datetime: 'datetime',
};

/**
 * What about the columns changes the table's column definitions. The grid rebuilds those only when
 * this changes, so a parent that writes `columns={[...]}` inline does not make the table redo its
 * filtering and sorting on every render. Functions are not part of it; they are looked up through
 * `getColumn` when called.
 */
export function columnsSignature<Row extends RowData>(
  columns: readonly DataGridColumn<Row>[],
): string {
  return columns
    .map((column) =>
      [
        columnIdOf(column),
        typeof column.accessor === 'function' ? 'fn' : (column.accessor ?? ''),
        column.header,
        column.width ?? '',
        column.minWidth ?? '',
        column.maxWidth ?? '',
        column.sortable ?? '',
        typeof column.sort === 'function' ? 'fn' : (column.sort ?? ''),
        column.filterable ?? '',
        column.filter ?? '',
        column.searchable ?? '',
        column.hideable ?? '',
        column.resizable ?? '',
        column.pinnable ?? '',
        column.groupable ?? '',
        typeof column.aggregate === 'function' ? 'fn' : (column.aggregate ?? ''),
      ].join('\u001f'),
    )
    .join('\u001e');
}

interface BuildOptions<Row extends RowData> {
  /** Looks a column up by id at call time, so inline functions stay current. */
  getColumn: (id: string) => DataGridColumn<Row> | undefined;
  selectable: boolean;
  expandable: boolean;
}

/** Turns the grid's columns into TanStack Table column definitions (and its utility columns). */
export function buildColumnDefs<Row extends RowData>(
  columns: readonly DataGridColumn<Row>[],
  { getColumn, selectable, expandable }: BuildOptions<Row>,
): ColumnDef<GridFeatures, Row, unknown>[] {
  const defs: Array<Record<string, unknown>> = [];

  const utility = (id: string) => ({
    id,
    header: '',
    size: UTILITY_COLUMN_WIDTH,
    minSize: UTILITY_COLUMN_WIDTH,
    maxSize: UTILITY_COLUMN_WIDTH,
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: false,
    enableGrouping: false,
  });
  if (selectable) defs.push(utility(SELECT_COLUMN_ID));
  if (expandable) defs.push(utility(EXPAND_COLUMN_ID));

  for (const column of columns) {
    const id = columnIdOf(column);
    const hasAccessor = column.accessor !== undefined;
    const def: Record<string, unknown> = {
      id,
      header: column.header,
      size: column.width ?? DEFAULT_COLUMN_WIDTH,
      minSize: column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH,
      enableSorting: hasAccessor && (column.sortable ?? true),
      sortUndefined: 'last',
      enableColumnFilter: hasAccessor && !!column.filterable,
      enableGlobalFilter: hasAccessor && (column.searchable ?? true),
      enableHiding: column.hideable ?? true,
      enableResizing: column.resizable ?? true,
      enablePinning: column.pinnable ?? true,
      enableGrouping: hasAccessor && !!column.groupable,
    };
    if (column.maxWidth !== undefined) def.maxSize = column.maxWidth;

    if (hasAccessor) {
      def.accessorFn = (row: Row) => {
        const current = getColumn(id) ?? column;
        return readAccessor(current, row);
      };
    }

    if (column.filterable) def.filterFn = filterFnNames[column.filter ?? 'text'];

    if (typeof column.sort === 'function') {
      def.sortFn = (
        rowA: { getValue: (id: string) => unknown; original: Row },
        rowB: { getValue: (id: string) => unknown; original: Row },
      ) => {
        const compare = getColumn(id)?.sort;
        const fn = typeof compare === 'function' ? compare : (column.sort as typeof compare);
        return typeof fn === 'function'
          ? fn(rowA.getValue(id), rowB.getValue(id), rowA.original, rowB.original)
          : 0;
      };
    } else if (column.sort) {
      def.sortFn = sortFnNames[column.sort];
    }

    if (typeof column.aggregate === 'function') {
      def.aggregationFn = constructAggregationFn({
        aggregate: ({ rows, getValue }) => {
          const reduce = getColumn(id)?.aggregate;
          const fn = typeof reduce === 'function' ? reduce : (column.aggregate as typeof reduce);
          if (typeof fn !== 'function') return undefined;
          return fn(
            rows.map((row) => getValue(row)),
            rows.map((row) => row.original as Row),
          );
        },
      });
    } else if (column.aggregate) {
      def.aggregationFn = column.aggregate;
    }

    defs.push(def);
  }

  return defs as unknown as ColumnDef<GridFeatures, Row, unknown>[];
}
