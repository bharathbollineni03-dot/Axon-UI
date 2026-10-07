/**
 * Turns the values a grid holds into dates and text. Date-only strings (`2025-03-09`) are days, not
 * moments, so they are read in the local time zone (`new Date('2025-03-09')` would be UTC midnight,
 * which is the previous evening anywhere west of Greenwich).
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Reads a `Date`, a timestamp or a date string. `null` when the value is none of these. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const day = DATE_ONLY.exec(value.trim());
    if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed);
  }
  return null;
}

/** `YYYY-MM-DD` in the local time zone: the value of a date input. */
export function toDateInputValue(value: unknown): string {
  const date = toDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear()).padStart(4, '0')}-${month}-${day}`;
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** What a cell shows when its column has no `cell` renderer. */
export function formatCellValue(value: unknown, locale?: string): string {
  if (isBlank(value)) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString(locale);
  }
  if (typeof value === 'number') return value.toLocaleString(locale);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((item) => formatCellValue(item, locale)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** The lower-case text the search box compares against. */
export function searchText(value: unknown, locale?: string): string {
  if (isBlank(value)) return '';
  if (typeof value === 'number') return `${value} ${value.toLocaleString(locale)}`.toLowerCase();
  if (value instanceof Date) {
    return `${toDateInputValue(value)} ${formatCellValue(value, locale)}`.toLowerCase();
  }
  return formatCellValue(value, locale).toLowerCase();
}
