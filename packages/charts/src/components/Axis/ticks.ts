import type { ValueFormat } from '../../internal/format';
import { estimateTextWidth } from '../../internal/layout';
import type { XScale, YScale } from '../../internal/scales';

/** One tick on an axis: where it is, what it stands for, and what it says. */
export interface AxisTick {
  value: unknown;
  /** Pixels along the axis. */
  position: number;
  label: string;
}

export interface XTickOptions {
  /** About how many ticks. */
  count?: number;
  /** A d3-format specifier (for numbers), or a function that turns a value into a label. */
  format?: string | ((value: unknown) => string);
  locale?: string;
}

export interface YTickOptions {
  /** About how many ticks. */
  count?: number;
  /** A d3-format specifier such as `$,.0f`, or a function that turns a number into a label. */
  format?: ValueFormat;
}

/** Ticks for a category, number or time scale. */
export function xScaleTicks(
  scale: XScale,
  { count, format, locale }: XTickOptions = {},
): AxisTick[] {
  const label =
    typeof format === 'function'
      ? format
      : scale.tickFormat({ count, spec: typeof format === 'string' ? format : undefined, locale });
  return scale.ticks(count).map((value) => ({
    value,
    position: scale.position(value),
    label: label(value),
  }));
}

/** Ticks for a numeric scale. */
export function yScaleTicks(scale: YScale, { count, format }: YTickOptions = {}): AxisTick[] {
  const label =
    typeof format === 'function'
      ? format
      : scale.tickFormat(count, typeof format === 'string' ? format : undefined);
  return scale.ticks(count).map((value) => ({
    value,
    position: scale.position(value),
    label: label(value),
  }));
}

/**
 * The most ticks that fit along `length` pixels without their labels touching. It tries from
 * `maxCount` down and stops at the first count whose widest label leaves a gap of `gap` pixels.
 */
export function fitTickCount(
  makeTicks: (count: number) => readonly { label: string }[],
  length: number,
  { maxCount = 10, gap = 12 }: { maxCount?: number; gap?: number } = {},
): number {
  for (let count = maxCount; count > 2; count -= 1) {
    const ticks = makeTicks(count);
    const widest = ticks.reduce((max, tick) => Math.max(max, estimateTextWidth(tick.label)), 0);
    if (ticks.length * (widest + gap) <= length) return count;
  }
  return 2;
}
