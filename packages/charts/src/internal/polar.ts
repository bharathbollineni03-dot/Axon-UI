import { arc, pie } from 'd3-shape';

/**
 * Angles in this file are radians measured clockwise from 12 o'clock, the way d3's arcs and pies
 * work: 0 is straight up, π/2 is 3 o'clock.
 */

export const TAU = Math.PI * 2;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export interface Point {
  x: number;
  y: number;
}

/** The point at `radius` and `angle` from a centre. */
export function polarToCartesian(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

/** The angle of a point seen from a centre, in `[0, 2π)`, clockwise from 12 o'clock. */
export function angleOf(cx: number, cy: number, x: number, y: number): number {
  const angle = Math.atan2(x - cx, cy - y);
  return angle < 0 ? angle + TAU : angle;
}

export interface Slice {
  /** Position in the list of values given, so a slice can be matched with its data. */
  index: number;
  value: number;
  /** The share of the total, from 0 to 1. */
  share: number;
  startAngle: number;
  endAngle: number;
  /** Halfway round the slice: where a label or a pulled-out slice points. */
  midAngle: number;
}

export interface PieLayoutOptions {
  /** Where the first slice starts. Defaults to 0 (12 o'clock). */
  startAngle?: number;
  /** Where the last ends. Defaults to a full turn after `startAngle`. */
  endAngle?: number;
  /** The gap between slices, in radians. */
  padAngle?: number;
}

/**
 * Splits a circle (or part of one) among values, in the order given. Negative and non-finite
 * values count as 0, and a slice of 0 is empty. All slices are 0 when the total is 0.
 */
export function layoutPie(
  values: readonly number[],
  { startAngle = 0, endAngle = startAngle + TAU, padAngle = 0 }: PieLayoutOptions = {},
): Slice[] {
  const safe = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = safe.reduce((sum, value) => sum + value, 0);
  const arcs = pie<number>()
    .value((value) => value)
    .sort(null)
    .startAngle(startAngle)
    .endAngle(endAngle)
    .padAngle(padAngle)(safe);
  return arcs.map((slice) => ({
    index: slice.index,
    value: slice.value,
    share: total > 0 ? slice.value / total : 0,
    startAngle: slice.startAngle,
    endAngle: slice.endAngle,
    midAngle: (slice.startAngle + slice.endAngle) / 2,
  }));
}

export interface ArcOptions {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  padAngle?: number;
  cornerRadius?: number;
}

/** The SVG path of a ring segment (or a pie slice when `innerRadius` is 0), centred on the origin. */
export function arcPath({
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  padAngle = 0,
  cornerRadius = 0,
}: ArcOptions): string {
  return (
    arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .padAngle(padAngle)
      .cornerRadius(cornerRadius)(undefined as never) ?? ''
  );
}

export interface LeaderLine {
  /** On the edge of the pie. */
  start: Point;
  /** Where the line bends, a little way out. */
  elbow: Point;
  /** Where the line ends and the label starts. */
  end: Point;
  /** Which side of the pie the label is on: it is right-aligned on the left and left-aligned on the right. */
  side: 'left' | 'right';
}

/**
 * A line from the edge of a slice out to its label: straight out from the middle of the slice,
 * then across towards the nearer side.
 */
export function leaderLine(
  midAngle: number,
  radius: number,
  {
    cx = 0,
    cy = 0,
    reach = 12,
    run = 14,
  }: { cx?: number; cy?: number; reach?: number; run?: number } = {},
): LeaderLine {
  const start = polarToCartesian(cx, cy, radius, midAngle);
  const elbow = polarToCartesian(cx, cy, radius + reach, midAngle);
  const side = Math.sin(midAngle) >= 0 ? 'right' : 'left';
  const end = { x: elbow.x + (side === 'right' ? run : -run), y: elbow.y };
  return { start, elbow, end, side };
}

/**
 * Moves labels apart so none is closer than `gap` to the next, keeping them within `[min, max]`
 * and in the order they came. Returns the new positions, in the order given.
 */
export function spreadLabels(
  positions: readonly number[],
  gap: number,
  min: number,
  max: number,
): number[] {
  const order = positions
    .map((position, index) => ({ position, index }))
    .sort((a, b) => a.position - b.position);
  const placed = order.map((item) => item.position);
  // Push down from the top, so nothing sits above the one before it...
  for (let i = 0; i < placed.length; i += 1) {
    const floor = i === 0 ? min : placed[i - 1]! + gap;
    if (placed[i]! < floor) placed[i] = floor;
  }
  // ...then pull back up from the bottom if that ran past the end.
  for (let i = placed.length - 1; i >= 0; i -= 1) {
    const ceiling = i === placed.length - 1 ? max : placed[i + 1]! - gap;
    if (placed[i]! > ceiling) placed[i] = ceiling;
  }
  const result = new Array<number>(positions.length);
  order.forEach((item, rank) => {
    result[item.index] = placed[rank]!;
  });
  return result;
}
