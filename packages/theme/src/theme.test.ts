import { describe, expect, it } from 'vitest';
import { createTheme, defaultTheme } from './theme';
import { paletteNames, palettes, shades, spacingKeys } from './tokens';

describe('default tokens', () => {
  it('defines every palette with shades 50-950', () => {
    expect(paletteNames).toEqual([
      'primary',
      'secondary',
      'success',
      'warning',
      'danger',
      'info',
      'neutral',
    ]);
    for (const name of paletteNames) {
      expect(Object.keys(palettes[name]).map(Number)).toEqual([...shades]);
    }
  });

  it('defines the spacing scale in rem multiples', () => {
    expect([...spacingKeys]).toEqual(['0', '0.5', '1', '1.5', '2', '3', '4', '6', '8', '12', '16']);
    expect(Object.keys(defaultTheme.spacing).sort()).toEqual([...spacingKeys].sort());
    expect(defaultTheme.spacing['4']).toBe('1rem');
  });

  it('orders z-index layers from dropdown to tooltip', () => {
    const { dropdown, sticky, modal, popover, toast, tooltip } = defaultTheme.zIndex;
    expect([dropdown, sticky, modal, popover, toast, tooltip]).toEqual(
      [dropdown, sticky, modal, popover, toast, tooltip].sort((a, b) => a - b),
    );
  });
});

describe('createTheme', () => {
  it('returns an equal copy of the default theme when called without overrides', () => {
    const theme = createTheme();
    expect(theme).toEqual(defaultTheme);
    expect(theme).not.toBe(defaultTheme);
    expect(theme.palette).not.toBe(defaultTheme.palette);
  });

  it('deep-merges overrides and keeps sibling tokens', () => {
    const theme = createTheme({
      palette: { primary: { 500: '#ff0000' } },
      semantic: { dark: { background: '#000' } },
      radius: { md: '1rem' },
    });
    expect(theme.palette.primary[500]).toBe('#ff0000');
    expect(theme.palette.primary[600]).toBe(defaultTheme.palette.primary[600]);
    expect(theme.palette.secondary).toEqual(defaultTheme.palette.secondary);
    expect(theme.semantic.dark.background).toBe('#000');
    expect(theme.semantic.dark.surface).toBe(defaultTheme.semantic.dark.surface);
    expect(theme.semantic.light).toEqual(defaultTheme.semantic.light);
    expect(theme.radius.md).toBe('1rem');
    expect(theme.radius.lg).toBe(defaultTheme.radius.lg);
  });

  it('does not mutate the default theme or the overrides', () => {
    const before = JSON.stringify(defaultTheme);
    const overrides = { palette: { primary: { 500: '#123456' } } };
    const overridesBefore = JSON.stringify(overrides);
    createTheme(overrides);
    expect(JSON.stringify(defaultTheme)).toBe(before);
    expect(JSON.stringify(overrides)).toBe(overridesBefore);
  });

  it('ignores undefined overrides and unknown keys', () => {
    const theme = createTheme({
      radius: { md: undefined },
      // @ts-expect-error unknown token groups are rejected by the types
      bogus: { a: 1 },
    });
    expect(theme.radius.md).toBe(defaultTheme.radius.md);
    expect(theme).not.toHaveProperty('bogus');
  });

  it('can extend a custom base theme', () => {
    const brand = createTheme({ palette: { primary: { 500: '#0f0' } } });
    const dark = createTheme({ radius: { md: '2px' } }, brand);
    expect(dark.palette.primary[500]).toBe('#0f0');
    expect(dark.radius.md).toBe('2px');
  });
});
