/** Where one series' bar sits inside a category's band, along the band. */
export interface BarSlot {
  key: string;
  /** Distance from the start of the band. */
  offset: number;
  /** Thickness of the bar. */
  size: number;
}

export interface GroupOptions {
  /** Space between the bars of a group, as a share of the slot each bar is given. Defaults to 0.1. */
  padding?: number;
  /** The thickest a bar may get, in pixels; a thinner bar is centred in its slot. */
  maxSize?: number;
}

/**
 * Splits a band between the bars of a group, side by side. Each bar gets an equal slot with
 * `padding` between them; none is thicker than `maxSize`.
 */
export function groupSlots(
  keys: readonly string[],
  bandwidth: number,
  { padding = 0.1, maxSize }: GroupOptions = {},
): BarSlot[] {
  const count = keys.length;
  if (count === 0) return [];
  // n bars and n - 1 gaps: step * (n - padding) = bandwidth, as in d3's band scale.
  const step = bandwidth / (count - padding);
  return keys.map((key, index) => {
    const slot = step * (1 - padding);
    const size = maxSize !== undefined ? Math.min(slot, maxSize) : slot;
    return { key, offset: index * step + (slot - size) / 2, size };
  });
}

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The rectangle of one bar from `from` to `to` (pixels along the value axis), placed at `start`
 * along the category axis with `size` thickness. Bars may point either way; the rectangle always
 * has a positive width and height.
 */
export function barRect({
  start,
  size,
  from,
  to,
  horizontal,
}: {
  start: number;
  size: number;
  from: number;
  to: number;
  horizontal: boolean;
}): BarRect {
  const low = Math.min(from, to);
  const length = Math.abs(to - from);
  return horizontal
    ? { x: low, y: start, width: length, height: size }
    : { x: start, y: low, width: size, height: length };
}

/** Which end of the bar is rounded: the one away from its baseline. */
export type FreeEnd = 'top' | 'bottom' | 'left' | 'right';

/**
 * A bar as a path with the free end rounded and the end on the baseline square. The radius is
 * held to what fits, so a short or thin bar is never drawn inside out.
 */
export function roundedBarPath(rect: BarRect, radius: number, freeEnd: FreeEnd): string {
  const { x, y, width: w, height: h } = rect;
  const horizontal = freeEnd === 'left' || freeEnd === 'right';
  const r = Math.max(0, Math.min(radius, (horizontal ? h : w) / 2, horizontal ? w : h));
  if (r === 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  switch (freeEnd) {
    case 'top':
      return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
    case 'bottom':
      return `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
    case 'right':
      return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
    case 'left':
      return `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`;
  }
}
