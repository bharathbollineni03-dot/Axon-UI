import { describe, expect, it } from 'vitest';
import { responsiveVars, spaceVar } from './responsive';

describe('responsiveVars', () => {
  const fmt = (v: number) => `${v}px`;

  it('returns nothing for undefined', () => {
    expect(responsiveVars('x', undefined, fmt)).toEqual({});
  });

  it('sets only the base variable for a plain value', () => {
    expect(responsiveVars('x', 4, fmt)).toEqual({ '--axon-x': '4px' });
    expect(responsiveVars('x', 0, fmt)).toEqual({ '--axon-x': '0px' });
  });

  it('sets a variable per given breakpoint', () => {
    expect(responsiveVars('x', { base: 1, md: 2, '2xl': 3 }, fmt)).toEqual({
      '--axon-x': '1px',
      '--axon-x-md': '2px',
      '--axon-x-2xl': '3px',
    });
  });

  it('allows leaving out the base value', () => {
    expect(responsiveVars('x', { lg: 5 }, fmt)).toEqual({ '--axon-x-lg': '5px' });
  });
});

describe('spaceVar', () => {
  it('maps spacing steps to theme variables', () => {
    expect(spaceVar(0)).toBe('0');
    expect(spaceVar(4)).toBe('var(--axon-space-4)');
    expect(spaceVar(0.5)).toBe('var(--axon-space-0-5)');
    expect(spaceVar(1.5)).toBe('var(--axon-space-1-5)');
  });
});
