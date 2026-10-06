import { describe, expect, it } from 'vitest';
import { defaultTheme, type Theme } from './theme';
import { paletteNames } from './tokens';

/** Resolves `var(--axon-color-<name>-<shade>)` / `var(--axon-color-white)` to a hex color. */
function resolve(theme: Theme, value: string): string {
  const match = /^var\(--axon-color-(?:(\w+)-(\d+)|(white|black))\)$/.exec(value);
  if (!match) throw new Error(`Cannot resolve ${value}`);
  const [, name, shade, common] = match;
  if (common) return theme.common[common as 'white' | 'black'];
  return theme.palette[name as keyof Theme['palette']][Number(shade) as 50];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe.each(['light', 'dark'] as const)('%s mode contrast', (mode) => {
  const semantic = defaultTheme.semantic[mode];
  const accent = defaultTheme.accent[mode];
  const color = (value: string) => resolve(defaultTheme, value);
  const surface = color(semantic.surface);
  const background = color(semantic.background);

  it.each(paletteNames)('%s: on-solid text on solid fill is at least 4.5:1', (name) => {
    for (const state of ['solid', 'solidHover', 'solidActive'] as const) {
      expect(
        contrast(color(accent[name].onSolid), color(accent[name][state])),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(paletteNames)('%s: accent text is at least 4.5:1 on surface and background', (name) => {
    for (const state of ['text', 'textHover'] as const) {
      expect(contrast(color(accent[name][state]), surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color(accent[name][state]), background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Pressing implies hovering, so the pressed fill is paired with the hover text color.
  it.each(paletteNames)('%s: accent text is at least 4.5:1 on its subtle fills', (name) => {
    const text = color(accent[name].text);
    const textHover = color(accent[name].textHover);
    expect(contrast(text, color(accent[name].subtle))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, color(accent[name].subtleHover))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textHover, color(accent[name].subtleHover))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(textHover, color(accent[name].subtleActive))).toBeGreaterThanOrEqual(4.5);
  });

  it('text tokens meet 4.5:1 and borders meet 3:1 on the surface', () => {
    expect(contrast(color(semantic.textPrimary), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(semantic.textSecondary), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(semantic.textPlaceholder), surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(semantic.borderStrong), surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(color(semantic.focusRing), surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(color(semantic.focusRing), background)).toBeGreaterThanOrEqual(3);
  });

  it('placeholder text stays readable on the muted (filled input) background', () => {
    expect(
      contrast(color(semantic.textPlaceholder), color(semantic.surfaceMuted)),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
