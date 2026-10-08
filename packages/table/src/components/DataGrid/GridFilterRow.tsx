import { useMemo, useRef } from 'react';
import { DatePicker, NumberInput, Select, TextField } from '@axonui/core';
import type { RowData } from '@tanstack/react-table';
import { readAccessor } from '../../internal/buildColumns';
import { cx } from '../../internal/cx';
import { formatCellValue, isBlank, toDate, toDateInputValue } from '../../internal/format';
import { useDebouncedCommit } from '../../internal/useDebouncedCommit';
import type { DataGridColumn, DataGridOption } from '../../types';
import { cellLayoutStyle, pinnedClasses, type GridColumn } from './cellStyle';
import { useGridContext } from './gridContext';

type Bound = number | string | undefined;
type Range = [Bound, Bound] | undefined;

/** Two ranges are the same when they have the same ends; an empty range is no filter at all. */
const sameRange = (a: Range, b: Range) => {
  const key = (range: Range) => (range ? `${range[0] ?? ''}|${range[1] ?? ''}` : '|');
  return key(a) === key(b);
};

/** The distinct values of a column, as options for a select filter. */
function useOptions<Row extends RowData>(
  definition: DataGridColumn<Row>,
  data: readonly Row[],
  locale: string | undefined,
): DataGridOption[] {
  // The column definition is often written inline; what matters is its id and its options.
  const definitionRef = useRef(definition);
  definitionRef.current = definition;
  const { id, filterOptions } = definition;
  return useMemo(() => {
    if (filterOptions) return filterOptions;
    const current = definitionRef.current;
    const seen = new Map<string, string>();
    for (const row of data) {
      const value = readAccessor(current, row);
      if (isBlank(value)) continue;
      const key = String(value);
      if (!seen.has(key)) seen.set(key, formatCellValue(value, locale));
    }
    return [...seen]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale, { numeric: true }));
    // `id` stands for the column: the definition is read through a ref because it is often inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filterOptions, data, locale]);
}

interface ColumnFilterProps<Row extends RowData> {
  column: GridColumn<Row>;
  definition: DataGridColumn<Row>;
  data: readonly Row[];
  debounce: number;
}

function TextFilter<Row extends RowData>({ column, definition, debounce }: ColumnFilterProps<Row>) {
  const { labels } = useGridContext<Row>();
  const [text, setText] = useDebouncedCommit(
    (column.getFilterValue() as string | undefined) ?? '',
    (value) => column.setFilterValue(value),
    debounce,
    (a, b) => a.trim() === b.trim(),
  );
  return (
    <TextField
      size="sm"
      fullWidth
      aria-label={labels.filterColumn(definition.header)}
      placeholder={labels.filterPlaceholder}
      value={text}
      onChange={(event) => setText(event.target.value)}
      clearable
      onClear={() => setText('')}
    />
  );
}

function NumberRangeFilter<Row extends RowData>({
  column,
  definition,
  debounce,
}: ColumnFilterProps<Row>) {
  const { labels } = useGridContext<Row>();
  const [range, setRange] = useDebouncedCommit<Range>(
    column.getFilterValue() as Range,
    (value) => column.setFilterValue(value),
    debounce,
    sameRange,
  );
  const min = typeof range?.[0] === 'number' ? range[0] : null;
  const max = typeof range?.[1] === 'number' ? range[1] : null;
  return (
    <div className="axon-datagrid__filter-range">
      <NumberInput
        size="sm"
        hideSteppers
        aria-label={labels.filterMin(definition.header)}
        placeholder="Min"
        value={min}
        onChange={(value) => setRange([value ?? undefined, range?.[1]])}
      />
      <NumberInput
        size="sm"
        hideSteppers
        aria-label={labels.filterMax(definition.header)}
        placeholder="Max"
        value={max}
        onChange={(value) => setRange([range?.[0], value ?? undefined])}
      />
    </div>
  );
}

function DateRangeFilter<Row extends RowData>({
  column,
  definition,
  debounce,
}: ColumnFilterProps<Row>) {
  const { labels, locale } = useGridContext<Row>();
  const [range, setRange] = useDebouncedCommit<Range>(
    column.getFilterValue() as Range,
    (value) => column.setFilterValue(value),
    debounce,
    sameRange,
  );
  const day = (date: Date | null) => (date ? toDateInputValue(date) : undefined);
  return (
    <div className="axon-datagrid__filter-range">
      <DatePicker
        size="sm"
        clearable
        locale={locale}
        aria-label={labels.filterFrom(definition.header)}
        value={toDate(range?.[0])}
        onChange={(date) => setRange([day(date), range?.[1]])}
      />
      <DatePicker
        size="sm"
        clearable
        locale={locale}
        aria-label={labels.filterTo(definition.header)}
        value={toDate(range?.[1])}
        onChange={(date) => setRange([range?.[0], day(date)])}
      />
    </div>
  );
}

function SelectFilter<Row extends RowData>({ column, definition, data }: ColumnFilterProps<Row>) {
  const { labels, locale } = useGridContext<Row>();
  const options = useOptions(definition, data, locale);
  const all = useMemo(
    () => [{ value: '', label: labels.filterAll }, ...options],
    [labels, options],
  );
  return (
    <Select
      size="sm"
      fullWidth
      aria-label={labels.filterColumn(definition.header)}
      options={all}
      value={(column.getFilterValue() as string | undefined) ?? ''}
      onChange={(value) => column.setFilterValue(value === '' ? undefined : value)}
    />
  );
}

export interface GridFilterRowProps<Row extends RowData> {
  columns: GridColumn<Row>[];
  growColumnId: string | undefined;
  data: readonly Row[];
  /** The `aria-rowindex` of this row. */
  ariaRowIndex: number;
  debounce: number;
}

/** The row under the headers with a filter for each column that has one. */
export function GridFilterRow<Row extends RowData>({
  columns,
  growColumnId,
  data,
  ariaRowIndex,
  debounce,
}: GridFilterRowProps<Row>) {
  const { columnsById, labels } = useGridContext<Row>();
  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-label={labels.filterRow}
      className="axon-datagrid__row axon-datagrid__row--filter"
    >
      {columns.map((column, index) => {
        const definition = columnsById.get(column.id);
        const filter = definition && column.getCanFilter() ? definition : undefined;
        const Control = filter
          ? {
              text: TextFilter,
              select: SelectFilter,
              'number-range': NumberRangeFilter,
              'date-range': DateRangeFilter,
            }[filter.filter ?? 'text']
          : null;
        return (
          <div
            key={column.id}
            role="gridcell"
            aria-colindex={index + 1}
            className={cx(
              'axon-datagrid__cell',
              'axon-datagrid__filter-cell',
              ...pinnedClasses(column),
            )}
            style={cellLayoutStyle(column, column.id === growColumnId)}
          >
            {filter && Control ? (
              <Control column={column} definition={filter} data={data} debounce={debounce} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
