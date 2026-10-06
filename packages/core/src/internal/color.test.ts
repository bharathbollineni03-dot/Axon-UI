import { describe, expect, it } from 'vitest';
import { normalizeHex, prefersDarkText, relativeLuminance } from './color';

describe('normalizeHex', () => {
  it.each([
    ['#3B82F6', '#3b82f6'],
    ['3b82f6', '#3b82f6'],
    ['#abc', '#aabbcc'],
    ['ABC', '#aabbcc'],
    ['  #ffffff ', '#ffffff'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each(['', '#', '#12', '#12345', '#1234567', '#ggg', 'red', '##fff'])('rejects %j', (input) => {
    expect(normalizeHex(input)).toBeNull();
  });
});

describe('contrast helpers', () => {
  it('computes luminance at the extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('chooses readable text for a background', () => {
    expect(prefersDarkText('#ffffff')).toBe(true);
    expect(prefersDarkText('#fde68a')).toBe(true);
    expect(prefersDarkText('#000000')).toBe(false);
    expect(prefersDarkText('#1e3a8a')).toBe(false);
  });
});
