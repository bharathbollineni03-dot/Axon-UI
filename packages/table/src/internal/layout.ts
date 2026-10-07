import type { RowData } from '@tanstack/react-table';
import type { DataGridColumn, DataGridDensity, DataGridLayout } from '../types';
import { columnIdOf } from './buildColumns';

/** Row heights in pixels by density. They are fixed so that virtualization can lay rows out. */
export const DENSITY_ROW_HEIGHT: Record<DataGridDensity, number> = {
  compact: 32,
  standard: 44,
  comfortable: 56,
};

export const DENSITIES: readonly DataGridDensity[] = ['compact', 'standard', 'comfortable'];

/** The layout a grid starts with: what was saved, then what the columns ask for. */
export function createInitialLayout<Row extends RowData>(
  columns: readonly DataGridColumn<Row>[],
  saved: Partial<DataGridLayout> | undefined,
  defaultDensity: DataGridDensity | undefined,
): DataGridLayout {
  const known = new Set(columns.map(columnIdOf));
  const visibility: Record<string, boolean> = {};
  const left: string[] = [];
  const right: string[] = [];
  for (const column of columns) {
    const id = columnIdOf(column);
    if (column.defaultHidden) visibility[id] = false;
    if (column.pinned === 'left') left.push(id);
    if (column.pinned === 'right') right.push(id);
  }
  const keep = (ids: readonly string[] | undefined) => (ids ?? []).filter((id) => known.has(id));

  return {
    columnOrder: keep(saved?.columnOrder),
    columnSizing: pick(saved?.columnSizing, known),
    columnVisibility: { ...visibility, ...pick(saved?.columnVisibility, known) },
    columnPinning: saved?.columnPinning
      ? { left: keep(saved.columnPinning.left), right: keep(saved.columnPinning.right) }
      : { left, right },
    density: saved?.density ?? defaultDensity ?? 'standard',
  };
}

function pick<Value>(
  record: Record<string, Value> | undefined,
  known: ReadonlySet<string>,
): Record<string, Value> {
  const result: Record<string, Value> = {};
  for (const [key, value] of Object.entries(record ?? {})) {
    if (known.has(key)) result[key] = value;
  }
  return result;
}

/** Applies an updater that is either the next value or a function of the previous one. */
export function applyUpdater<Value>(
  updater: Value | ((previous: Value) => Value),
  previous: Value,
) {
  return typeof updater === 'function'
    ? (updater as (previous: Value) => Value)(previous)
    : updater;
}
