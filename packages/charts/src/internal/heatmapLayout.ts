import { toNumber } from './format';
import { uniqueCategories } from './scales';
import type { ChartDatum } from './stack';

// ---------------------------------------------------------------------------------------------
// Levels

/**
 * Which of `steps` levels a value falls in, from 0 (the lowest) to `steps - 1`, by equal-width
 * ranges of the domain. A value outside the domain is held to the nearest end. `-1` means there
 * is no value.
 */
export function levelFor(
  value: number | null | undefined,
  domain: readonly [number, number],
  steps: number,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return -1;
  if (steps <= 1) return 0;
  const [low, high] = domain;
  if (high <= low) return value > low ? steps - 1 : 0;
  const share = (value - low) / (high - low);
  return Math.min(steps - 1, Math.max(0, Math.floor(share * steps)));
}

/** How opaque a level is: faint for the lowest, solid for the highest. */
export function levelOpacity(level: number, steps: number): number {
  if (level < 0) return 0;
  if (steps <= 1) return 1;
  return 0.18 + (0.82 * level) / (steps - 1);
}

// ---------------------------------------------------------------------------------------------
// A grid of categories

export interface MatrixCell {
  /** Column, along the x categories. */
  col: number;
  /** Row, down the y categories. */
  row: number;
  x: string;
  y: string;
  value: number | null;
  datum: ChartDatum | null;
}

export interface Matrix {
  xs: string[];
  ys: string[];
  /** `cells[row][col]`: every position has a cell, empty ones with `value: null`. */
  cells: MatrixCell[][];
}

export interface MatrixKeys {
  xKey: string;
  yKey: string;
  valueKey: string;
  /** Fixes the order of the x categories, and which there are. Others appear after, as found. */
  xOrder?: readonly string[];
  yOrder?: readonly string[];
}

/**
 * Arranges rows of `{ x, y, value }` into a grid. Categories appear in the order they are first
 * seen, unless an order is given. Rows that share a cell are added together; a cell with no rows
 * has no value.
 */
export function buildMatrix(data: readonly ChartDatum[], keys: MatrixKeys): Matrix {
  const { xKey, yKey, valueKey } = keys;
  const xs = [...new Set([...(keys.xOrder ?? []), ...uniqueCategories(data.map((d) => d[xKey]))])];
  const ys = [...new Set([...(keys.yOrder ?? []), ...uniqueCategories(data.map((d) => d[yKey]))])];
  const cells: MatrixCell[][] = ys.map((y, row) =>
    xs.map((x, col) => ({ col, row, x, y, value: null, datum: null })),
  );
  for (const datum of data) {
    const row = ys.indexOf(String(datum[yKey] ?? ''));
    const col = xs.indexOf(String(datum[xKey] ?? ''));
    if (row === -1 || col === -1) continue;
    const cell = cells[row]![col]!;
    const value = toNumber(datum[valueKey]);
    if (value === null) {
      cell.datum ??= datum;
      continue;
    }
    cell.value = (cell.value ?? 0) + value;
    cell.datum = datum;
  }
  return { xs, ys, cells };
}

/** The lowest and highest values in a matrix, with where they are, or `null` when it has none. */
export function matrixExtremes(matrix: Matrix) {
  let low: MatrixCell | null = null;
  let high: MatrixCell | null = null;
  for (const row of matrix.cells) {
    for (const cell of row) {
      if (cell.value === null) continue;
      if (!low || cell.value < low.value!) low = cell;
      if (!high || cell.value > high.value!) high = cell;
    }
  }
  return low && high ? { low, high } : null;
}

// ---------------------------------------------------------------------------------------------
// A calendar

const DAY = 24 * 60 * 60 * 1000;

/**
 * A date, date text or time as a `Date` at midnight local time, or `null`. Text like
 * `2024-03-15` is the 15th wherever you are: JavaScript would read it as midnight UTC, which is
 * still the 14th in the Americas.
 */
export function toDay(value: unknown): Date | null {
  if (typeof value === 'string') {
    const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (plain) {
      const day = new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
      return Number.isNaN(day.getTime()) ? null : day;
    }
  }
  const date =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole days from `from` to `to`, by the calendar, so a day with 23 or 25 hours still counts as one. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

export interface CalendarCell {
  date: Date;
  /** Column: the week, counted from the first. */
  col: number;
  /** Row: the weekday, from 0 for the first day of the week. */
  row: number;
  value: number | null;
  datum: ChartDatum | null;
}

export interface CalendarLayout {
  /** Every day from the first to the last, in order. */
  cells: CalendarCell[];
  /** How many columns: weeks. */
  weeks: number;
  /** The columns where a month starts, for labelling. */
  months: { col: number; date: Date }[];
  /** `grid[row][col]`: a cell, or `null` before the first and after the last day. */
  grid: (CalendarCell | null)[][];
}

/**
 * Lays days out as a calendar, a column for each week and a row for each weekday, from the first
 * date in the data to the last. Days with no row have no value. Rows on the same day are added
 * together.
 */
export function calendarLayout(
  data: readonly ChartDatum[],
  {
    dateKey,
    valueKey,
    weekStartsOn = 0,
  }: { dateKey: string; valueKey: string; weekStartsOn?: number },
): CalendarLayout {
  const byDay = new Map<number, { value: number | null; datum: ChartDatum }>();
  for (const datum of data) {
    const day = toDay(datum[dateKey]);
    if (!day) continue;
    const value = toNumber(datum[valueKey]);
    const existing = byDay.get(day.getTime());
    byDay.set(day.getTime(), {
      value: value === null ? (existing?.value ?? null) : (existing?.value ?? 0) + value,
      datum,
    });
  }
  const times = [...byDay.keys()];
  if (times.length === 0) return { cells: [], weeks: 0, months: [], grid: [] };

  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const startRow = (first.getDay() - weekStartsOn + 7) % 7;
  const total = daysBetween(first, last) + 1;

  const cells: CalendarCell[] = [];
  for (let offset = 0; offset < total; offset += 1) {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
    const found = byDay.get(date.getTime());
    cells.push({
      date,
      col: Math.floor((offset + startRow) / 7),
      row: (offset + startRow) % 7,
      value: found?.value ?? null,
      datum: found?.datum ?? null,
    });
  }
  const weeks = cells[cells.length - 1]!.col + 1;
  const grid: (CalendarCell | null)[][] = Array.from({ length: 7 }, () =>
    new Array(weeks).fill(null),
  );
  for (const cell of cells) grid[cell.row]![cell.col] = cell;

  // A month is labelled where its first day falls, and at the very start unless that would crowd it.
  const months: CalendarLayout['months'] = [];
  for (const cell of cells) {
    if (cell.date.getDate() === 1) months.push({ col: cell.col, date: cell.date });
  }
  if (months.length === 0 || months[0]!.col >= 3) months.unshift({ col: 0, date: first });
  return { cells, weeks, months, grid };
}
