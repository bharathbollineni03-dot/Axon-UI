import { describe, expect, it } from 'vitest';
import {
  formatTime,
  getDayPeriodLabels,
  isValidTimeString,
  parseTimeString,
  parseTimeText,
  toMinutes,
  toTimeString,
  usesTwelveHourClock,
} from './time';

describe('time strings', () => {
  it('validates and converts HH:mm', () => {
    expect(isValidTimeString('09:05')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('9:05')).toBe(false);
    expect(isValidTimeString('12:60')).toBe(false);
    expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(parseTimeString('nope')).toBeNull();
    expect(parseTimeString(null)).toBeNull();
    expect(toTimeString({ hour: 7, minute: 3 })).toBe('07:03');
    expect(toMinutes({ hour: 1, minute: 30 })).toBe(90);
  });
});

describe('locale', () => {
  it('knows which locales use a 12-hour clock', () => {
    expect(usesTwelveHourClock('en-US')).toBe(true);
    expect(usesTwelveHourClock('de-DE')).toBe(false);
    expect(usesTwelveHourClock('en-GB')).toBe(false);
  });

  it('formats a time for the clock style', () => {
    const parts = { hour: 15, minute: 5 };
    expect(formatTime(parts, 'en-US', true)).toMatch(/^3:05\s?PM$/);
    expect(formatTime(parts, 'en-US', false)).toBe('15:05');
    expect(formatTime({ hour: 0, minute: 0 }, 'en-US', true)).toMatch(/^12:00\s?AM$/);
  });

  it('returns the locale AM and PM strings', () => {
    expect(getDayPeriodLabels('en-US')).toEqual(['AM', 'PM']);
  });
});

describe('parseTimeText', () => {
  it.each([
    ['15:30', { hour: 15, minute: 30 }],
    ['3:30 PM', { hour: 15, minute: 30 }],
    ['3:30pm', { hour: 15, minute: 30 }],
    ['3 pm', { hour: 15, minute: 0 }],
    ['12 am', { hour: 0, minute: 0 }],
    ['12:15 AM', { hour: 0, minute: 15 }],
    ['12 pm', { hour: 12, minute: 0 }],
    ['1530', { hour: 15, minute: 30 }],
    ['9', { hour: 9, minute: 0 }],
    ['9.45', { hour: 9, minute: 45 }],
    ['  7:05  a.m. ', { hour: 7, minute: 5 }],
  ])('parses %s', (text, expected) => {
    expect(parseTimeText(text)).toEqual(expected);
  });

  it.each(['', 'noon', '25:00', '12:60', '13 pm', '0 pm', '1:2', '3:30 xm'])(
    'rejects %j',
    (text) => {
      expect(parseTimeText(text)).toBeNull();
    },
  );
});
