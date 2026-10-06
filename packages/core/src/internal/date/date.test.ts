import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  clampDate,
  compareDays,
  createDate,
  daysInMonth,
  formatDate,
  getDateOrder,
  getDatePlaceholder,
  getFirstDayOfWeek,
  getMonthMatrix,
  getWeekdayNames,
  isSameDay,
  parseDate,
  parseISODate,
  startOfDay,
  toISODate,
} from './date';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('arithmetic', () => {
  it('adds days across month and year ends', () => {
    expect(toISODate(addDays(d(2026, 12, 31), 1))).toBe('2027-01-01');
    expect(toISODate(addDays(d(2026, 3, 1), -1))).toBe('2026-02-28');
  });

  it('adds months and clamps the day', () => {
    expect(toISODate(addMonths(d(2026, 1, 31), 1))).toBe('2026-02-28');
    expect(toISODate(addMonths(d(2024, 1, 31), 1))).toBe('2024-02-29');
    expect(toISODate(addMonths(d(2026, 1, 15), -2))).toBe('2025-11-15');
  });

  it('knows month lengths and compares days ignoring time', () => {
    expect(daysInMonth(d(2024, 2, 1))).toBe(29);
    expect(daysInMonth(d(2026, 2, 1))).toBe(28);
    expect(isSameDay(new Date(2026, 5, 1, 23, 59), new Date(2026, 5, 1, 0, 0))).toBe(true);
    expect(compareDays(new Date(2026, 4, 1, 23), d(2026, 5, 2))).toBeLessThan(0);
    expect(startOfDay(new Date(2026, 5, 1, 13, 45)).getHours()).toBe(0);
  });

  it('clamps a date into a range', () => {
    const min = d(2026, 5, 10);
    const max = d(2026, 5, 20);
    expect(toISODate(clampDate(d(2026, 5, 1), min, max))).toBe('2026-05-10');
    expect(toISODate(clampDate(d(2026, 5, 30), min, max))).toBe('2026-05-20');
    expect(toISODate(clampDate(d(2026, 5, 15), min, max))).toBe('2026-05-15');
    expect(toISODate(clampDate(d(2026, 5, 15)))).toBe('2026-05-15');
  });
});

describe('creation and ISO', () => {
  it('rejects impossible dates', () => {
    expect(createDate(2026, 2, 31)).toBeNull();
    expect(createDate(2026, 13, 1)).toBeNull();
    expect(createDate(2024, 2, 29)).not.toBeNull();
    expect(createDate(2026, 2, 29)).toBeNull();
  });

  it('round-trips ISO dates', () => {
    expect(toISODate(d(2026, 10, 5))).toBe('2026-10-05');
    expect(parseISODate('2026-10-05')).toEqual(d(2026, 10, 5));
    expect(parseISODate('2026-1-5')).toEqual(d(2026, 1, 5));
    expect(parseISODate('2026-02-31')).toBeNull();
    expect(parseISODate('nope')).toBeNull();
  });
});

describe('locale handling', () => {
  it('formats with Intl for the given locale', () => {
    expect(formatDate(d(2026, 10, 5), 'en-US')).toBe('10/05/2026');
    expect(formatDate(d(2026, 10, 5), 'en-GB')).toBe('05/10/2026');
    expect(formatDate(d(2026, 10, 5), 'de-DE')).toBe('05.10.2026');
  });

  it('derives the numeric date order and a placeholder', () => {
    expect(getDateOrder('en-US')).toEqual(['month', 'day', 'year']);
    expect(getDateOrder('en-GB')).toEqual(['day', 'month', 'year']);
    expect(getDateOrder('ja-JP')).toEqual(['year', 'month', 'day']);
    expect(getDatePlaceholder('en-US')).toBe('MM/DD/YYYY');
    expect(getDatePlaceholder('de-DE')).toBe('DD.MM.YYYY');
  });

  it('parses typed text according to the locale order, and ISO everywhere', () => {
    expect(parseDate('10/05/2026', 'en-US')).toEqual(d(2026, 10, 5));
    expect(parseDate('10/05/2026', 'en-GB')).toEqual(d(2026, 5, 10));
    expect(parseDate('5.10.2026', 'de-DE')).toEqual(d(2026, 10, 5));
    expect(parseDate('2026-10-05', 'en-GB')).toEqual(d(2026, 10, 5));
    expect(parseDate('1/2/26', 'en-US')).toEqual(d(2026, 1, 2));
  });

  it('rejects text that is not a real date', () => {
    expect(parseDate('', 'en-US')).toBeNull();
    expect(parseDate('13/45/2026', 'en-US')).toBeNull();
    expect(parseDate('02/31/2026', 'en-US')).toBeNull();
    expect(parseDate('October', 'en-US')).toBeNull();
    expect(parseDate('1/2', 'en-US')).toBeNull();
  });

  it('lists weekday names from the first day of the week', () => {
    expect(getWeekdayNames('en-US', 0).map((w) => w.short)).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
    const monday = getWeekdayNames('en-US', 1);
    expect(monday[0]).toEqual({ long: 'Monday', short: 'Mon' });
    expect(monday[6]!.long).toBe('Sunday');
  });

  it('returns a first day of week between 0 and 6 and survives invalid locales', () => {
    expect(getFirstDayOfWeek('en-US')).toBeGreaterThanOrEqual(0);
    expect(getFirstDayOfWeek('en-US')).toBeLessThanOrEqual(6);
    expect(getFirstDayOfWeek('not a locale')).toBe(0);
  });
});

describe('getMonthMatrix', () => {
  it('lays out whole weeks with null padding', () => {
    // October 2026 starts on a Thursday and has 31 days.
    const rows = getMonthMatrix(d(2026, 10, 1), 0);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    expect(rows[0]!.slice(0, 4)).toEqual([null, null, null, null]);
    expect(rows[0]![4]).toEqual(d(2026, 10, 1));
    const days = rows.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(rows).toHaveLength(5);
  });

  it('respects the first day of the week', () => {
    const monday = getMonthMatrix(d(2026, 10, 1), 1);
    expect(monday[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(monday[0]![3]).toEqual(d(2026, 10, 1));
  });
});
