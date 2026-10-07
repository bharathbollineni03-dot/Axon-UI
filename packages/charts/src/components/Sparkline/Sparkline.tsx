import { useMemo, type CSSProperties } from 'react';
import { area, line } from 'd3-shape';
import { curveFactory, type CurveType } from '../../internal/curves';
import { createNumberFormatter, toNumber, type ValueFormat } from '../../internal/format';
import { chartColor } from '../../internal/palette';
import { computeDomain } from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';

export interface SparklineProps {
  /** The values, in order: numbers, or rows read with `valueKey`. Missing values leave a gap. */
  data: readonly (number | null | undefined | ChartDatum)[];
  /** The key to read when `data` is made of rows. Defaults to `value`. */
  valueKey?: string;
  /** `line` (default), `area` or `bar`. */
  type?: 'line' | 'area' | 'bar';
  /** How a line or area runs between points. Defaults to `monotone`. */
  curve?: CurveType;
  /** Any CSS color. Defaults to the first palette color. */
  color?: string;
  /** Width in pixels. Defaults to 96. */
  width?: number;
  /** Height in pixels. Defaults to 28. */
  height?: number;
  strokeWidth?: number;
  /** Marks the last value with a dot. Defaults to true for lines and areas. */
  showLast?: boolean;
  /** Marks the lowest and highest values with dots. */
  showExtremes?: boolean;
  /** Fixes the bottom of the scale. By default it fits the data. */
  min?: number;
  /** Fixes the top of the scale. By default it fits the data. */
  max?: number;
  /** Formats numbers in the generated description. */
  valueFormat?: ValueFormat;
  /** Replaces the generated description, such as "Weekly sign-ups, up 12%". */
  ariaLabel?: string;
  /**
   * Hides the sparkline from assistive technology, for when the text next to it already says
   * what it shows (a KPI card with its delta, say).
   */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

const PADDING = 3;

/**
 * A tiny, axis-less chart of a trend, for putting next to a number or inside a table cell. It
 * is an image with a generated description: the number of values, where it starts and ends, and
 * its lowest and highest points.
 */
export function Sparkline({
  data,
  valueKey = 'value',
  type = 'line',
  curve = 'monotone',
  color,
  width = 96,
  height = 28,
  strokeWidth = 1.5,
  showLast,
  showExtremes = false,
  min,
  max,
  valueFormat,
  ariaLabel,
  decorative = false,
  className,
  style,
}: SparklineProps) {
  const values = useMemo(
    () =>
      data.map((item) =>
        typeof item === 'object' && item !== null ? toNumber(item[valueKey]) : toNumber(item),
      ),
    [data, valueKey],
  );
  const stroke = color ?? chartColor(0);
  const formatNumber = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);

  const geometry = useMemo(() => {
    const [low, high] = computeDomain(values, { min, max });
    const count = values.length;
    const innerWidth = Math.max(0, width - 2 * PADDING);
    const innerHeight = Math.max(0, height - 2 * PADDING);
    const step = count > 1 ? innerWidth / (count - 1) : 0;
    const barWidth = count > 0 ? Math.max(1, (innerWidth / count) * 0.7) : 0;
    const xOf = (index: number) =>
      type === 'bar'
        ? PADDING + (innerWidth / Math.max(count, 1)) * (index + 0.5)
        : count > 1
          ? PADDING + step * index
          : width / 2;
    const yOf = (value: number) => PADDING + innerHeight * (1 - (value - low) / (high - low || 1));
    return { low, high, xOf, yOf, barWidth, innerHeight };
  }, [values, width, height, min, max, type]);

  const { xOf, yOf } = geometry;
  const points = values.map((value, index) => ({ value, x: xOf(index), index }));
  const present = points.filter(
    (point): point is typeof point & { value: number } => point.value !== null,
  );
  const last = present[present.length - 1];
  const lowest = present.reduce<(typeof present)[number] | undefined>(
    (best, point) => (!best || point.value < best.value ? point : best),
    undefined,
  );
  const highest = present.reduce<(typeof present)[number] | undefined>(
    (best, point) => (!best || point.value > best.value ? point : best),
    undefined,
  );

  const lineGenerator = line<(typeof points)[number]>()
    .defined((point) => point.value !== null)
    .x((point) => point.x)
    .y((point) => yOf(point.value as number))
    .curve(curveFactory(curve));
  const areaGenerator = area<(typeof points)[number]>()
    .defined((point) => point.value !== null)
    .x((point) => point.x)
    .y0(height - PADDING)
    .y1((point) => yOf(point.value as number))
    .curve(curveFactory(curve));

  const description =
    ariaLabel ??
    (present.length === 0
      ? 'Trend with no data.'
      : present.length === 1
        ? `Trend with 1 value: ${formatNumber(present[0]!.value)}.`
        : `Trend of ${present.length} values, from ${formatNumber(present[0]!.value)} to ${formatNumber(
            last!.value,
          )}. Lowest ${formatNumber(lowest!.value)}, highest ${formatNumber(highest!.value)}.`);

  const showEnd = showLast ?? type !== 'bar';

  return (
    <svg
      className={['axon-sparkline', className].filter(Boolean).join(' ')}
      style={style}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : description}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {type === 'bar'
        ? present.map((point) => {
            const top = yOf(point.value);
            const base = yOf(Math.max(geometry.low, Math.min(0, geometry.high)));
            return (
              <rect
                key={point.index}
                className="axon-sparkline__bar"
                x={point.x - geometry.barWidth / 2}
                y={Math.min(top, base)}
                width={geometry.barWidth}
                height={Math.max(1, Math.abs(base - top))}
                style={{ fill: stroke }}
              />
            );
          })
        : null}
      {type === 'area' ? (
        <path
          className="axon-sparkline__area"
          d={areaGenerator(points) ?? ''}
          style={{ fill: stroke }}
        />
      ) : null}
      {type !== 'bar' ? (
        <path
          className="axon-sparkline__line"
          d={lineGenerator(points) ?? ''}
          style={{ stroke, strokeWidth }}
        />
      ) : null}
      {showEnd && last && type !== 'bar' ? (
        <circle
          className="axon-sparkline__dot axon-sparkline__dot--last"
          cx={last.x}
          cy={yOf(last.value)}
          r={2.5}
          style={{ fill: stroke }}
        />
      ) : null}
      {showExtremes
        ? [lowest, highest].map((point, index) =>
            point ? (
              <circle
                key={index}
                className="axon-sparkline__dot axon-sparkline__dot--extreme"
                cx={point.x}
                cy={yOf(point.value)}
                r={2}
                style={{ fill: stroke }}
              />
            ) : null,
          )
        : null}
    </svg>
  );
}
