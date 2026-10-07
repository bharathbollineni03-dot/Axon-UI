import { area, line } from 'd3-shape';
import type { CartesianLayerContext } from '../components/CartesianPlot/CartesianPlot';
import { barRect, groupSlots, roundedBarPath, type FreeEnd } from './barGeometry';
import { curveFactory, type CurveType } from './curves';
import { toNumber } from './format';
import type { ResolvedSeries } from './palette';
import type { YScale } from './scales';
import type { StackedPoint } from './stack';

const dimmedClass = (context: CartesianLayerContext, key: string) =>
  context.highlighted !== null && context.highlighted !== key ? 'axon-chart__dimmed' : undefined;

// ---------------------------------------------------------------------------------------------
// Lines

/** The path of a line through one series, or `null` when it has no points. */
export function linePath(
  context: CartesianLayerContext,
  key: string,
  curve: CurveType,
  connectNulls: boolean,
  scale: YScale = context.value,
): string | null {
  const { data, positions } = context;
  const points = data
    .map((datum, index) => ({ x: positions[index]!, y: toNumber(datum[key]) }))
    .filter((point) => Number.isFinite(point.x) && (!connectNulls || point.y !== null));
  return line<{ x: number; y: number | null }>()
    .defined((point) => point.y !== null && Number.isFinite(point.x))
    .x((point) => point.x)
    .y((point) => scale.position(point.y as number))
    .curve(curveFactory(curve))(points);
}

export interface LineMarksProps {
  context: CartesianLayerContext;
  series: readonly ResolvedSeries[];
  /** The scale each series is drawn against. Defaults to the main value scale. */
  scaleFor?: (series: ResolvedSeries) => YScale;
  curve: CurveType;
  strokeWidth: number;
  connectNulls: boolean;
  dots: boolean;
}

/** A line, and optionally a dot on every point, for each series. */
export function LineMarks({
  context,
  series,
  scaleFor,
  curve,
  strokeWidth,
  connectNulls,
  dots,
}: LineMarksProps) {
  return (
    <g>
      {series.map((item) => {
        const scale = scaleFor?.(item) ?? context.value;
        const path = linePath(context, item.key, curve, connectNulls, scale);
        return (
          <g key={item.key} className={dimmedClass(context, item.key)}>
            {path ? (
              <path
                className="axon-chart__line"
                d={path}
                pathLength={1}
                style={{ stroke: item.color, strokeWidth }}
              />
            ) : null}
            {dots
              ? context.data.map((datum, index) => {
                  const y = toNumber(datum[item.key]);
                  const x = context.positions[index]!;
                  if (y === null || !Number.isFinite(x)) return null;
                  return (
                    <circle
                      key={index}
                      className="axon-chart__dot axon-chart__dot--static"
                      cx={x}
                      cy={scale.position(y)}
                      r={3}
                      style={{ fill: item.color }}
                    />
                  );
                })
              : null}
          </g>
        );
      })}
    </g>
  );
}

/** Larger dots on every shown series at the row being looked at. */
export function ActiveDots({
  context,
  series,
  index,
  scaleFor,
  valueAt,
}: {
  context: CartesianLayerContext;
  series: readonly ResolvedSeries[];
  index: number;
  scaleFor?: (series: ResolvedSeries) => YScale;
  /** Where on the value axis a series' dot sits, if not its own value (stacked charts). */
  valueAt?: (series: ResolvedSeries, index: number) => number | null;
}) {
  const x = context.positions[index];
  return (
    <g>
      {series.map((item) => {
        const y = valueAt ? valueAt(item, index) : toNumber(context.data[index]?.[item.key]);
        if (y === null || x === undefined || !Number.isFinite(x)) return null;
        return (
          <circle
            key={item.key}
            className="axon-chart__dot"
            cx={x}
            cy={(scaleFor?.(item) ?? context.value).position(y)}
            r={5}
            style={{ fill: item.color }}
          />
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Areas

export interface AreaMarksProps {
  context: CartesianLayerContext;
  series: readonly ResolvedSeries[];
  scaleFor?: (series: ResolvedSeries) => YScale;
  curve: CurveType;
  strokeWidth: number;
  fillOpacity: number;
  /** Draws a line along the top of each area. */
  outline: boolean;
  /** Where each series sits when stacked. Without it each area runs from the baseline to its own value. */
  stacks?: Map<string, StackedPoint[]>;
}

/** A filled area for each series, from its baseline to its value, or stacked on the others. */
export function AreaMarks({
  context,
  series,
  scaleFor,
  curve,
  strokeWidth,
  fillOpacity,
  outline,
  stacks,
}: AreaMarksProps) {
  return (
    <g>
      {series.map((item) => {
        const scale = scaleFor?.(item) ?? context.value;
        const stack = stacks?.get(item.key);
        const rows = context.data.map((datum, index) => {
          const own = toNumber(datum[item.key]);
          const x = context.positions[index]!;
          if (stack) {
            const point = stack[index]!;
            return { x, y0: point.y0, y1: point.y1, defined: Number.isFinite(x) };
          }
          return { x, y0: 0, y1: own ?? 0, defined: own !== null && Number.isFinite(x) };
        });
        const base = scale.baseline;
        const shape = area<(typeof rows)[number]>()
          .defined((row) => row.defined)
          .x((row) => row.x)
          .y0((row) => (stack ? scale.position(row.y0) : base))
          .y1((row) => scale.position(row.y1))
          .curve(curveFactory(curve));
        const top = line<(typeof rows)[number]>()
          .defined((row) => row.defined)
          .x((row) => row.x)
          .y((row) => scale.position(row.y1))
          .curve(curveFactory(curve));
        const fill = shape(rows);
        const edge = outline ? top(rows) : null;
        return (
          <g key={item.key} className={dimmedClass(context, item.key)}>
            {fill ? (
              <path
                className="axon-chart__area"
                d={fill}
                style={{ fill: item.color, fillOpacity }}
              />
            ) : null}
            {edge ? (
              <path
                className="axon-chart__area-outline axon-chart__line"
                d={edge}
                pathLength={1}
                style={{ stroke: item.color, strokeWidth }}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Bars

export interface BarMarksProps {
  context: CartesianLayerContext;
  series: readonly ResolvedSeries[];
  scaleFor?: (series: ResolvedSeries) => YScale;
  /** Where each series sits when stacked. Without it the bars of a group stand side by side. */
  stacks?: Map<string, StackedPoint[]>;
  /** The rounding of the free end of a bar, in pixels. Ignored for stacks. */
  radius: number;
  /** Space between the bars of a group, as a share of the slot each bar is given. */
  padding: number;
  maxBarSize?: number;
  /** Writes the value at the end of each bar, using this formatter. */
  valueLabel?: (value: number) => string;
}

/** A bar for each series in each row: side by side, or stacked. */
export function BarMarks({
  context,
  series,
  scaleFor,
  stacks,
  radius,
  padding,
  maxBarSize,
  valueLabel,
}: BarMarksProps) {
  const { horizontal, category, positions, data } = context;
  const slots = groupSlots(
    series.map((item) => item.key),
    category.bandwidth,
    { padding, maxSize: maxBarSize },
  );
  const stackedSlot = stacks
    ? {
        offset: (category.bandwidth - Math.min(category.bandwidth, maxBarSize ?? Infinity)) / 2,
        size: Math.min(category.bandwidth, maxBarSize ?? Infinity),
      }
    : null;

  return (
    <g>
      {series.map((item, seriesIndex) => {
        const scale = scaleFor?.(item) ?? context.value;
        const slot = stackedSlot ?? slots[seriesIndex]!;
        return (
          <g key={item.key} className={dimmedClass(context, item.key)}>
            {data.map((datum, index) => {
              const center = positions[index]!;
              if (!Number.isFinite(center)) return null;
              const value = toNumber(datum[item.key]);
              const point = stacks?.get(item.key)?.[index];
              if (!stacks && value === null) return null;
              const from = stacks ? scale.position(point!.y0) : scale.baseline;
              const to = stacks ? scale.position(point!.y1) : scale.position(value!);
              if (stacks && from === to) return null;
              const rect = barRect({
                start: center - category.bandwidth / 2 + slot.offset,
                size: slot.size,
                from,
                to,
                horizontal,
              });
              const negative = stacks ? point!.y1 < point!.y0 : (value ?? 0) < 0;
              const freeEnd: FreeEnd = horizontal
                ? negative
                  ? 'left'
                  : 'right'
                : negative
                  ? 'bottom'
                  : 'top';
              const d = roundedBarPath(rect, stacks ? 0 : radius, freeEnd);
              return (
                <g key={index}>
                  <path
                    className={
                      horizontal ? 'axon-chart__bar axon-chart__bar--horizontal' : 'axon-chart__bar'
                    }
                    d={d}
                    style={{ fill: item.color }}
                  />
                  {valueLabel && !stacks && value !== null ? (
                    <text
                      className="axon-chart__value-label"
                      textAnchor={horizontal ? (negative ? 'end' : 'start') : 'middle'}
                      x={
                        horizontal
                          ? negative
                            ? rect.x - 4
                            : rect.x + rect.width + 4
                          : rect.x + rect.width / 2
                      }
                      y={
                        horizontal
                          ? rect.y + rect.height / 2
                          : negative
                            ? rect.y + rect.height + 12
                            : rect.y - 4
                      }
                      dy={horizontal ? '0.32em' : 0}
                    >
                      {valueLabel(value)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
