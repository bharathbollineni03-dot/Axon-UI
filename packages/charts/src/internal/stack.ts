import {
  stack,
  stackOffsetDiverging,
  stackOffsetExpand,
  stackOffsetNone,
  stackOffsetSilhouette,
  stackOrderNone,
} from 'd3-shape';
import { toNumber } from './format';

export type ChartDatum = Record<string, unknown>;

/**
 * How stacked values sit on each other: `none` adds them up from 0, `diverging` stacks negative
 * values downwards from 0 (for bars), `expand` makes every stack 0 to 1 (100% stacked), and
 * `silhouette` centres the stacks on the middle (a stream graph).
 */
export type StackOffset = 'none' | 'diverging' | 'expand' | 'silhouette';

export interface StackedPoint {
  /** Where this series' part of the stack starts. */
  y0: number;
  /** Where it ends. */
  y1: number;
}

const offsets = {
  none: stackOffsetNone,
  diverging: stackOffsetDiverging,
  expand: stackOffsetExpand,
  silhouette: stackOffsetSilhouette,
} as const;

/**
 * Stacks the series on each other, row by row. Missing values count as 0. The result has one
 * entry per key, each with one `{ y0, y1 }` per row of `data`.
 */
export function stackSeries(
  data: readonly ChartDatum[],
  keys: readonly string[],
  offset: StackOffset = 'none',
): Map<string, StackedPoint[]> {
  const stacked = stack<ChartDatum, string>()
    .keys([...keys])
    .value((datum, key) => toNumber(datum[key]) ?? 0)
    .order(stackOrderNone)
    .offset(offsets[offset])([...data]);
  const result = new Map<string, StackedPoint[]>();
  for (const layer of stacked) {
    result.set(
      layer.key,
      layer.map(([y0, y1]) => ({ y0, y1 })),
    );
  }
  return result;
}
