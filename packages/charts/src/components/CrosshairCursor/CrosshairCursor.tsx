export interface CrosshairCursorProps {
  /** Where it is across the plot: an x for a vertical line, a y for a horizontal one. */
  position: number;
  /** How far the line reaches, in pixels, from the top (vertical) or left (horizontal) of the plot. */
  length: number;
  /** `vertical` (default) follows an x position; `horizontal` follows a y position, for horizontal bars. */
  orientation?: 'vertical' | 'horizontal';
}

/** A dashed guide through the data point being looked at. It does not take pointer events. */
export function CrosshairCursor({
  position,
  length,
  orientation = 'vertical',
}: CrosshairCursorProps) {
  if (!Number.isFinite(position)) return null;
  return orientation === 'vertical' ? (
    <line className="axon-chart__crosshair" x1={position} x2={position} y1={0} y2={length} />
  ) : (
    <line className="axon-chart__crosshair" x1={0} x2={length} y1={position} y2={position} />
  );
}
