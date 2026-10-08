import type { ValueFormat } from './format';

/** How many colors the default palette has before it repeats. */
export const PALETTE_SIZE = 8;

/**
 * The color of the n-th series (0-based): one of `--axon-chart-1` to `--axon-chart-8`, defined in
 * `@axonui/charts/styles.css` from the theme's color scales and switched for dark mode. Series
 * past the eighth reuse the palette.
 */
export function chartColor(index: number): string {
  const slot = ((index % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE;
  return `var(--axon-chart-${slot + 1})`;
}

/** A series as given by the caller: only `key` is required. */
export interface SeriesInput {
  key: string;
  /** The name shown in the legend, tooltip and data table. Defaults to the key. */
  name?: string;
  /** Any CSS color. Defaults to the next color of the palette. */
  color?: string;
  /** How this series' values read in the tooltip and data table, when it differs from the chart's `valueFormat`. */
  format?: ValueFormat;
}

export interface ResolvedSeries {
  key: string;
  name: string;
  color: string;
  /** Position in the list you gave, which fixes the default color even while others are hidden. */
  index: number;
  format?: ValueFormat;
}

/** Fills in the name and color of each series. */
export function resolveSeries<T extends SeriesInput>(series: readonly T[]): (T & ResolvedSeries)[] {
  return series.map((item, index) => ({
    ...item,
    key: item.key,
    name: item.name ?? item.key,
    color: item.color ?? chartColor(index),
    index,
  }));
}
