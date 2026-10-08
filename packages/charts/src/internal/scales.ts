import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { createDateTickFormatter, formatValue, isFiniteNumber, PLAIN_NUMBER } from './format';

// ---------------------------------------------------------------------------------------------
// Domains

export interface DomainOptions {
  /** Makes sure 0 is inside the domain. Bars and areas want this; lines usually do not. */
  includeZero?: boolean;
  /** Fixes the low end, whatever the data says. */
  min?: number;
  /** Fixes the high end, whatever the data says. */
  max?: number;
}

/**
 * The `[low, high]` that a set of values spans. Missing and non-finite values are ignored. It
 * never returns an empty domain: no values give `[0, 1]`, and all-equal values are widened so a
 * scale can still draw them.
 */
export function computeDomain(
  values: readonly (number | null | undefined)[],
  { includeZero = false, min, max }: DomainOptions = {},
): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (!isFiniteNumber(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  if (low === Infinity) {
    low = 0;
    high = 1;
  }
  if (includeZero) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (min !== undefined) low = min;
  if (max !== undefined) high = max;
  if (low === high) {
    if (low === 0) return [0, 1];
    const pad = Math.abs(low) * 0.1;
    return [low - pad, high + pad];
  }
  return low < high ? [low, high] : [high, low];
}

// ---------------------------------------------------------------------------------------------
// Y scales

export interface YScale {
  /** The values at the two ends, after rounding to nice numbers when asked. */
  domain: [number, number];
  /** Pixels for `domain[0]` and `domain[1]`. For a y axis the first is the bottom. */
  range: [number, number];
  /** Pixels for a value. */
  position(value: number): number;
  /** The value at a pixel position. */
  invert(position: number): number;
  ticks(count?: number): number[];
  /** A formatter whose precision suits the tick step. `spec` is a d3-format specifier. */
  tickFormat(count?: number, spec?: string): (value: number) => string;
  /** Pixels for 0, held inside the range, for bars and areas to grow from. */
  baseline: number;
}

export interface CreateYScaleOptions {
  domain: readonly [number, number];
  range: readonly [number, number];
  /** Rounds the domain out to tick values. Defaults to true. */
  nice?: boolean;
  /** About how many ticks the nice rounding aims for. Defaults to 5. */
  tickCount?: number;
}

export function createYScale({
  domain,
  range,
  nice = true,
  tickCount = 5,
}: CreateYScaleOptions): YScale {
  const scale = scaleLinear()
    .domain([...domain])
    .range([...range]);
  if (nice) scale.nice(tickCount);
  const resolved = scale.domain() as [number, number];
  const [low, high] = resolved;
  const zero = Math.min(Math.max(0, low), high);
  return {
    domain: resolved,
    range: [range[0], range[1]],
    position: (value) => scale(value),
    invert: (position) => scale.invert(position),
    ticks: (count = tickCount) => scale.ticks(count),
    tickFormat: (count = tickCount, spec) => scale.tickFormat(count, spec),
    baseline: scale(zero),
  };
}

// ---------------------------------------------------------------------------------------------
// X scales

/**
 * How x values are laid out: `band` gives each category a slot (bars), `point` puts categories
 * on evenly spaced points (lines), `linear` and `time` place numbers and dates by value.
 */
export type XScaleKind = 'band' | 'point' | 'linear' | 'time';

/** The kind that suits the values for a line or area: dates are `time`, numbers `linear`, the rest `point`. */
export function inferXKind(values: readonly unknown[]): Exclude<XScaleKind, 'band'> {
  const present = values.filter((value) => value !== null && value !== undefined);
  if (present.length && present.every((value) => value instanceof Date)) return 'time';
  if (present.length && present.every(isFiniteNumber)) return 'linear';
  return 'point';
}

export interface XScale {
  kind: XScaleKind;
  /** Pixels for the two ends of the axis. */
  range: [number, number];
  /** The categories, in order, for `band` and `point`; `[first, last]` for `linear` and `time`. */
  domain: unknown[];
  /** The middle of a value's slot or point. `NaN` for a value that is not on the scale. */
  position(value: unknown): number;
  /** The width of one slot. 0 unless the scale is `band`. */
  bandwidth: number;
  /** The distance between neighbouring slots or points. 0 for `linear` and `time`. */
  step: number;
  /** Values for ticks. Categories are thinned to about `count`; numbers and dates use nice values. */
  ticks(count?: number): unknown[];
  /** Turns a tick into its label. */
  tickFormat(options?: {
    count?: number;
    spec?: string;
    locale?: string;
  }): (value: unknown) => string;
}

export interface CreateXScaleOptions {
  values: readonly unknown[];
  kind: XScaleKind;
  range: readonly [number, number];
  /** Space between bands as a share of a band. Defaults to 0.2. */
  bandPadding?: number;
  /** Space before the first and after the last point or band, in steps. Defaults to 0.5 for points, 0.1 for bands. */
  outerPadding?: number;
}

/** The distinct categories in the order they first appear. */
export function uniqueCategories(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (value === null || value === undefined) continue;
    seen.add(value instanceof Date ? value.toISOString() : String(value));
  }
  return [...seen];
}

const categoryKey = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

/** Keeps about `count` of the items, evenly spaced, always starting with the first. */
export function thinCategories<T>(items: readonly T[], count: number): T[] {
  if (count < 1) return [];
  if (items.length <= count) return [...items];
  const every = Math.ceil(items.length / count);
  return items.filter((_, index) => index % every === 0);
}

export function createXScale({
  values,
  kind,
  range,
  bandPadding = 0.2,
  outerPadding,
}: CreateXScaleOptions): XScale {
  const rangeTuple: [number, number] = [range[0], range[1]];

  if (kind === 'band' || kind === 'point') {
    const categories = uniqueCategories(values);
    const display = new Map<string, unknown>();
    for (const value of values) {
      if (value !== null && value !== undefined && !display.has(categoryKey(value))) {
        display.set(categoryKey(value), value);
      }
    }
    const base = kind === 'band' ? scaleBand<string>() : scalePoint<string>();
    const scale = base.domain(categories).range(rangeTuple);
    if (kind === 'band') {
      (scale as ReturnType<typeof scaleBand<string>>)
        .paddingInner(bandPadding)
        .paddingOuter(outerPadding ?? 0.1);
    } else {
      (scale as ReturnType<typeof scalePoint<string>>).padding(outerPadding ?? 0.5);
    }
    const bandwidth =
      kind === 'band' ? (scale as ReturnType<typeof scaleBand<string>>).bandwidth() : 0;
    const step =
      categories.length > 1 ? Math.abs(scale(categories[1]!)! - scale(categories[0]!)!) : 0;
    return {
      kind,
      range: rangeTuple,
      domain: categories.map((key) => display.get(key) ?? key),
      position: (value) => {
        const start = scale(categoryKey(value));
        return start === undefined ? NaN : start + bandwidth / 2;
      },
      bandwidth,
      step,
      ticks: (count = categories.length) =>
        thinCategories(
          categories.map((key) => display.get(key) ?? key),
          count,
        ),
      tickFormat:
        ({ locale } = {}) =>
        (value) =>
          formatValue(value, String, locale),
    };
  }

  const numeric =
    kind === 'time'
      ? values.map((value) => toTime(value))
      : values.map((value) => (isFiniteNumber(value) ? value : null));
  const [low, high] = computeDomain(numeric);
  // A single value still needs a span to sit in; computeDomain widened it.
  const domain = [low, high];

  if (kind === 'time') {
    const scale = scaleTime()
      .domain(domain.map((ms) => new Date(ms)))
      .range(rangeTuple);
    return {
      kind,
      range: rangeTuple,
      domain: [new Date(low), new Date(high)],
      position: (value) => {
        const ms = toTime(value);
        return ms === null ? NaN : scale(new Date(ms));
      },
      bandwidth: 0,
      step: 0,
      ticks: (count = 6) => scale.ticks(count),
      tickFormat: ({ locale } = {}) => {
        const formatter = createDateTickFormatter(new Date(low), new Date(high), { locale });
        return (value) => formatter(value as Date);
      },
    };
  }

  const scale = scaleLinear().domain(domain).range(rangeTuple);
  return {
    kind,
    range: rangeTuple,
    domain: [low, high],
    position: (value) => (isFiniteNumber(value) ? scale(value) : NaN),
    bandwidth: 0,
    step: 0,
    ticks: (count = 6) => scale.ticks(count),
    tickFormat: ({ count = 6, spec } = {}) => {
      const format = scale.tickFormat(count, spec ?? PLAIN_NUMBER);
      return (value) => format(value as number);
    },
  };
}

function toTime(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (isFiniteNumber(value)) return value;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Hit testing

/** The index of the position closest to `target`, or -1 when none can be compared. */
export function nearestIndex(positions: readonly number[], target: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index]!;
    if (!Number.isFinite(position)) continue;
    const distance = Math.abs(position - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}
