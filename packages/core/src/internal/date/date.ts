/**
 * Date helpers. Dates are local calendar dates (time of day ignored); everything locale-related
 * goes through `Intl`. Nothing here reads the system locale, so output is the same on the server
 * and the client for a given `locale`.
 */

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const daysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export const addDays = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);

/** Adds months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  target.setDate(Math.min(date.getDate(), daysInMonth(target)));
  return target;
}

export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  Boolean(a && b) &&
  a!.getFullYear() === b!.getFullYear() &&
  a!.getMonth() === b!.getMonth() &&
  a!.getDate() === b!.getDate();

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Negative when `a` is before `b`, 0 when the same day, positive when after. */
export const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();

export function clampDate(date: Date, min?: Date | null, max?: Date | null): Date {
  if (min && compareDays(date, min) < 0) return startOfDay(min);
  if (max && compareDays(date, max) > 0) return startOfDay(max);
  return date;
}

export const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const pad = (n: number, length = 2) => String(n).padStart(length, '0');

/** `yyyy-mm-dd`, the format form submissions and APIs usually want. */
export const toISODate = (date: Date) =>
  `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Builds a date only if the components form a real calendar date (no 31 February). */
export function createDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  date.setFullYear(year); // years 0-99 would otherwise map to 1900-1999
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function parseISODate(text: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text.trim());
  return match ? createDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

/** First day of the week (0 = Sunday ... 6 = Saturday) for a locale, when the runtime knows it. */
export function getFirstDayOfWeek(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    };
    const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
    if (info) return info.firstDay % 7; // Intl uses 1 = Monday ... 7 = Sunday
  } catch {
    // Invalid locale tag: fall through to the default.
  }
  return 0;
}

export function formatDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' },
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

type DatePartName = 'day' | 'month' | 'year';

const SAMPLE = new Date(2006, 10, 22); // 22 Nov 2006: day, month and year all differ

/** The order of day/month/year in a locale's numeric date format, e.g. `month, day, year`. */
export function getDateOrder(locale: string): DatePartName[] {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(SAMPLE)
    .map((part) => part.type)
    .filter((type): type is DatePartName => type === 'day' || type === 'month' || type === 'year');
}

/** A placeholder such as `MM/DD/YYYY` or `DD.MM.YYYY` for a locale. */
export function getDatePlaceholder(locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(SAMPLE)
    .map((part) =>
      part.type === 'day'
        ? 'DD'
        : part.type === 'month'
          ? 'MM'
          : part.type === 'year'
            ? 'YYYY'
            : part.value,
    )
    .join('');
}

/**
 * Parses typed text in a locale's numeric order (and ISO `yyyy-mm-dd` in any locale). Returns
 * `null` for anything that is not a real date.
 */
export function parseDate(text: string, locale: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const iso = parseISODate(trimmed);
  if (iso) return iso;

  const numbers = trimmed.match(/\d+/g);
  if (!numbers || numbers.length !== 3) return null;
  const parts: Partial<Record<DatePartName, number>> = {};
  getDateOrder(locale).forEach((name, index) => {
    parts[name] = Number(numbers[index]);
  });
  let year = parts.year!;
  if (numbers[getDateOrder(locale).indexOf('year')]!.length <= 2) year += 2000;
  return createDate(year, parts.month!, parts.day!);
}

export interface WeekdayName {
  /** Full name, e.g. "Monday". */
  long: string;
  /** Short name, e.g. "Mon" (or "M" for `narrow`). */
  short: string;
}

/** Weekday names starting at `firstDay` (0 = Sunday). */
export function getWeekdayNames(locale: string, firstDay: number): WeekdayName[] {
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const sunday = new Date(2023, 0, 1); // a Sunday
  return Array.from({ length: 7 }, (_, offset) => {
    const day = addDays(sunday, (firstDay + offset) % 7);
    return { long: long.format(day), short: short.format(day) };
  });
}

export const formatMonthYear = (date: Date, locale: string) =>
  formatDate(date, locale, { month: 'long', year: 'numeric' });

export const formatFullDate = (date: Date, locale: string) =>
  formatDate(date, locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/** Rows of 7 days (or `null` for padding) covering the month of `month`. */
export function getMonthMatrix(month: Date, firstDay: number): (Date | null)[][] {
  const first = startOfMonth(month);
  const leading = (first.getDay() - firstDay + 7) % 7;
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth(month); day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
