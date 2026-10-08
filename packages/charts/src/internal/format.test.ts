import { describe, expect, it } from 'vitest';
import {
  createDateTickFormatter,
  createNumberFormatter,
  formatPercent,
  formatValue,
  MISSING,
  toNumber,
} from './format';

describe('createNumberFormatter', () => {
  it('formats with thousands separators and up to two decimals by default', () => {
    const format = createNumberFormatter(undefined);
    expect(format(1234567)).toBe('1,234,567');
    expect(format(1234.5)).toBe('1,234.5');
    expect(format(1234.5678)).toBe('1,234.57');
    expect(format(0)).toBe('0');
  });

  it('takes a d3-format specifier', () => {
    expect(createNumberFormatter('$,.0f')(1234.5)).toBe('$1,235');
    expect(createNumberFormatter('.1%')(0.256)).toBe('25.6%');
    expect(createNumberFormatter('~s')(12000)).toBe('12k');
  });

  it('takes your own function', () => {
    expect(createNumberFormatter((value) => `${value} ms`)(5)).toBe('5 ms');
  });

  it('falls back to the default for a specifier that does not exist', () => {
    expect(createNumberFormatter('not a format')(1234)).toBe('1,234');
  });
});

describe('toNumber', () => {
  it('reads numbers and numeric text, and nothing else', () => {
    expect(toNumber(5)).toBe(5);
    expect(toNumber('5.5')).toBe(5.5);
    expect(toNumber(' 7 ')).toBe(7);
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(NaN)).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber({})).toBeNull();
  });
});

describe('formatValue', () => {
  const number = createNumberFormatter(',.0f');

  it('formats numbers, shows text as it is, and dashes out the missing', () => {
    expect(formatValue(1234, number)).toBe('1,234');
    expect(formatValue('March', number)).toBe('March');
    expect(formatValue(null, number)).toBe(MISSING);
    expect(formatValue(undefined, number)).toBe(MISSING);
    expect(formatValue(NaN, number)).toBe(MISSING);
    expect(formatValue(new Date(NaN), number)).toBe(MISSING);
  });

  it('writes a date out in full', () => {
    expect(formatValue(new Date(2024, 2, 15), number, 'en-US')).toMatch(/2024/);
  });
});

describe('createDateTickFormatter', () => {
  const year = (y: number, m = 0, d = 1) => new Date(y, m, d, 12);

  it('shows years for a span of years', () => {
    expect(createDateTickFormatter(year(2018), year(2024), { locale: 'en-US' })(year(2021))).toBe(
      '2021',
    );
  });

  it('shows the month for a span of months', () => {
    const label = createDateTickFormatter(year(2024), year(2024, 8), { locale: 'en-US' })(
      year(2024, 2),
    );
    expect(label).toMatch(/Mar/);
  });

  it('shows the day for a span of days', () => {
    const label = createDateTickFormatter(year(2024, 0, 1), year(2024, 0, 20), { locale: 'en-US' })(
      year(2024, 0, 9),
    );
    expect(label).toMatch(/Jan/);
    expect(label).toMatch(/9/);
  });

  it('shows the time for a span of hours', () => {
    const from = new Date(2024, 0, 1, 9, 0);
    const to = new Date(2024, 0, 1, 17, 0);
    expect(
      createDateTickFormatter(from, to, { locale: 'en-US' })(new Date(2024, 0, 1, 13, 30)),
    ).toMatch(/1:30/);
  });
});

describe('formatPercent', () => {
  it('writes a share of a total', () => {
    expect(formatPercent(1, 4)).toBe('25%');
    expect(formatPercent(1, 3)).toBe('33.3%');
    expect(formatPercent(0, 10)).toBe('0%');
  });

  it('does not divide by zero', () => {
    expect(formatPercent(5, 0)).toBe('0%');
  });
});
