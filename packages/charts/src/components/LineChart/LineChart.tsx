import { useCallback } from 'react';
import { line } from 'd3-shape';
import { curveFactory, type CurveType } from '../../internal/curves';
import { toNumber } from '../../internal/format';
import { computeDomain } from '../../internal/scales';
import type { CartesianChartProps } from '../../types';
import type { CartesianLayerContext, CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { CartesianShell, type SpecInput } from '../CartesianChart/CartesianShell';

export interface LineChartProps extends CartesianChartProps {
  /** How the line runs between points. Defaults to `linear`. */
  curve?: CurveType;
  /** Dots on the points: `true`, `false`, or `auto` (the default) for charts of 30 points or fewer. */
  dots?: boolean | 'auto';
  /** Line width in pixels. Defaults to 2. */
  strokeWidth?: number;
  /** Draws a line across missing values instead of leaving a gap. */
  connectNulls?: boolean;
  /** Fixes the bottom of the y axis. */
  yMin?: number;
  /** Fixes the top of the y axis. */
  yMax?: number;
  /** Starts the y axis at 0 even if the data is far from it. Defaults to false. */
  includeZero?: boolean;
}

/** The path of a line through one series, or `null` when it has no points. */
export function linePath(
  context: CartesianLayerContext,
  key: string,
  curve: CurveType,
  connectNulls: boolean,
): string | null {
  const { data, positions, value } = context;
  const points = data
    .map((datum, index) => ({ x: positions[index]!, y: toNumber(datum[key]) }))
    .filter((point) => Number.isFinite(point.x) && (!connectNulls || point.y !== null));
  const generator = line<{ x: number; y: number | null }>()
    .defined((point) => point.y !== null && Number.isFinite(point.x))
    .x((point) => point.x)
    .y((point) => value.position(point.y as number))
    .curve(curveFactory(curve));
  return generator(points);
}

/**
 * Lines for one or more series over a category, number or time axis. Move the pointer or use the
 * arrow keys to read values; press a legend item to hide its line.
 */
export function LineChart({
  curve = 'linear',
  dots = 'auto',
  strokeWidth = 2,
  connectNulls = false,
  yMin,
  yMax,
  includeZero = false,
  ...rest
}: LineChartProps) {
  const buildSpec = useCallback(
    ({ visible, data, xKind }: SpecInput): CartesianSpec => {
      const yDomain = computeDomain(
        visible.flatMap((item) => data.map((datum) => toNumber(datum[item.key]))),
        { includeZero, min: yMin, max: yMax },
      );
      const showDots = dots === 'auto' ? data.length <= 30 : dots;
      return {
        xKind,
        yDomain,
        cursor: 'line',
        renderLayers: (context) => (
          <g>
            {context.series.map((item) => {
              const path = linePath(context, item.key, curve, connectNulls);
              const dimmed = context.highlighted !== null && context.highlighted !== item.key;
              return (
                <g key={item.key} className={dimmed ? 'axon-chart__dimmed' : undefined}>
                  {path ? (
                    <path
                      className="axon-chart__line"
                      d={path}
                      pathLength={1}
                      style={{ stroke: item.color, strokeWidth }}
                    />
                  ) : null}
                  {showDots
                    ? context.data.map((datum, index) => {
                        const y = toNumber(datum[item.key]);
                        const x = context.positions[index]!;
                        if (y === null || !Number.isFinite(x)) return null;
                        return (
                          <circle
                            key={index}
                            className="axon-chart__dot axon-chart__dot--static"
                            cx={x}
                            cy={context.value.position(y)}
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
        ),
        renderActive: (context, index) => {
          const x = context.positions[index];
          return (
            <g>
              {context.series.map((item) => {
                const y = toNumber(context.data[index]?.[item.key]);
                if (y === null || x === undefined || !Number.isFinite(x)) return null;
                return (
                  <circle
                    key={item.key}
                    className="axon-chart__dot"
                    cx={x}
                    cy={context.value.position(y)}
                    r={5}
                    style={{ fill: item.color }}
                  />
                );
              })}
            </g>
          );
        },
      };
    },
    [curve, dots, strokeWidth, connectNulls, yMin, yMax, includeZero],
  );

  return (
    <CartesianShell
      {...rest}
      kind="line"
      kindLabel="Line chart"
      xKindOption="infer"
      buildSpec={buildSpec}
    />
  );
}
