import { format } from 'd3-format';

/** A number format: a d3-format specifier such as `,.0f` or `~s`, or your own function. */
export type ValueFormat = string | ((value: number) => string);

/** Used for values in tooltips and the data table: thousands separators, up to two decimals. */
export const DEFAULT_VALUE_FORMAT = ',.2~f';

/** What is shown for a missing value. */
export const MISSING = '–';

/** Turns a `ValueFormat` into a function. A bad specifier falls back to the default. */
export function createNumberFormatter(
  spec: ValueFormat | undefined,
  fallback: string = DEFAULT_VALUE_FORMAT,
): (value: number) => string {
  if (typeof spec === 'function') return spec;
  try {
    return format(spec ?? fallback);
  } catch {
    return format(fallback);
  }
}

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** A number from a value that may be a number or a numeric string, else `null`. */
export function toNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export interface DateFormatOptions {
  locale?: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** The part of a date worth showing on an axis spanning `from` to `to`: years, months, days or times. */
export function createDateTickFormatter(
  from: Date,
  to: Date,
  { locale }: DateFormatOptions = {},
): (date: Date) => string {
  const span = Math.abs(to.getTime() - from.getTime());
  let options: Intl.DateTimeFormatOptions;
  if (span >= 2 * 365 * DAY) options = { year: 'numeric' };
  else if (span >= 90 * DAY) options = { month: 'short', year: '2-digit' };
  else if (span >= 2 * DAY) options = { month: 'short', day: 'numeric' };
  else options = { hour: 'numeric', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return (date) => formatter.format(date);
}

/** A date with its day, for a tooltip heading. */
export function formatDateLong(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/**
 * Shows any value that can be on an axis or in a tooltip: numbers with `numberFormat`, dates in
 * a readable form, everything else as text. Missing values show as a dash.
 */
export function formatValue(
  value: unknown,
  numberFormat: (value: number) => string,
  locale?: string,
): string {
  if (value === null || value === undefined) return MISSING;
  if (typeof value === 'number') return Number.isFinite(value) ? numberFormat(value) : MISSING;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? MISSING : formatDateLong(value, locale);
  return String(value);
}

/**
 * Formats an x value for a tooltip, the data table or the summary. A function or a d3-format
 * specifier from the axis wins; otherwise dates read as dates, numbers are plain (so a year is
 * `2024`, not `2,024`) and everything else is text.
 */
export function createXFormatter(
  tickFormat: string | ((value: unknown) => string) | undefined,
  locale?: string,
): (value: unknown) => string {
  if (typeof tickFormat === 'function') return tickFormat;
  const numeric = format(typeof tickFormat === 'string' ? tickFormat : PLAIN_NUMBER);
  return (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? numeric(value) : MISSING;
    return formatValue(value, numeric, locale);
  };
}

/** Numbers as they are written, with no separators or exponent for any size a chart will see. */
export const PLAIN_NUMBER = '.12~g';

/** The share of a total as a percentage, such as "12.5%". */
export function formatPercent(part: number, total: number): string {
  if (!total) return '0%';
  return `${format('.1~f')((part / total) * 100)}%`;
}
