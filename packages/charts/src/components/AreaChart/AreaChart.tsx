import { useCallback, useMemo } from 'react';
import type { CurveType } from '../../internal/curves';
import { toNumber } from '../../internal/format';
import { ActiveDots, AreaMarks } from '../../internal/marks';
import { computeDomain } from '../../internal/scales';
import { stackSeries, type StackedPoint } from '../../internal/stack';
import type { AxisConfig, CartesianChartProps } from '../../types';
import type { CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { CartesianShell, type SpecInput } from '../CartesianChart/CartesianShell';

export interface AreaChartProps extends CartesianChartProps {
  /**
   * Stacks the series on each other so the top edge is their total: `true` adds them up, and
   * `percent` makes each row 100% to show shares. Without it the areas overlap from the baseline.
   */
  stacked?: boolean | 'percent';
  /** How the edge runs between points. Defaults to `linear`. */
  curve?: CurveType;
  /** Width of the line along the top of each area. Defaults to 2. */
  strokeWidth?: number;
  /** How solid the fill is, 0 to 1. Defaults to 0.2, or 0.75 when stacked. */
  fillOpacity?: number;
  /** Draws a line along the top of each area. Defaults to true. */
  outline?: boolean;
  /** Fixes the bottom of the y axis. */
  yMin?: number;
  /** Fixes the top of the y axis. */
  yMax?: number;
}

const stackedBounds = (stacks: Map<string, StackedPoint[]>): (number | null)[] =>
  [...stacks.values()].flatMap((points) => points.flatMap((point) => [point.y0, point.y1]));

/**
 * Filled areas for one or more series, overlapping or stacked. Stack them to show how a total
 * is made up, or make it `percent` to show how the shares change.
 */
export function AreaChart({
  stacked = false,
  curve = 'linear',
  strokeWidth = 2,
  fillOpacity,
  outline = true,
  yMin,
  yMax,
  yAxis,
  ...rest
}: AreaChartProps) {
  const percent = stacked === 'percent';
  const opacity = fillOpacity ?? (stacked ? 0.75 : 0.2);

  // A 100% stack is read as percentages.
  const yAxisConfig = useMemo<boolean | AxisConfig | undefined>(() => {
    if (!percent || yAxis === false) return yAxis;
    return { tickFormat: '.0%', ...(yAxis === true || yAxis === undefined ? {} : yAxis) };
  }, [percent, yAxis]);

  const buildSpec = useCallback(
    ({ visible, data, xKind }: SpecInput): CartesianSpec => {
      const stacks = stacked
        ? stackSeries(
            data,
            visible.map((item) => item.key),
            percent ? 'expand' : 'none',
          )
        : undefined;
      const yDomain = stacks
        ? percent
          ? ([0, 1] as [number, number])
          : computeDomain(stackedBounds(stacks), { includeZero: true, min: yMin, max: yMax })
        : computeDomain(
            visible.flatMap((item) => data.map((datum) => toNumber(datum[item.key]))),
            { includeZero: true, min: yMin, max: yMax },
          );
      const topOf = (key: string, index: number) => stacks?.get(key)?.[index]?.y1 ?? null;
      return {
        xKind,
        yDomain,
        // Areas run edge to edge, with no gap before the first point or after the last.
        outerPadding: 0,
        cursor: 'line',
        renderLayers: (context) => (
          <AreaMarks
            context={context}
            series={context.series}
            curve={curve}
            strokeWidth={strokeWidth}
            fillOpacity={opacity}
            outline={outline}
            stacks={stacks}
          />
        ),
        renderActive: (context, index) => (
          <ActiveDots
            context={context}
            series={context.series}
            index={index}
            valueAt={stacks ? (item, row) => topOf(item.key, row) : undefined}
          />
        ),
        anchorValue: stacks
          ? (index) =>
              visible.reduce<number | null>((best, item) => {
                const top = topOf(item.key, index);
                return top !== null && (best === null || top > best) ? top : best;
              }, null)
          : undefined,
      };
    },
    [stacked, percent, curve, strokeWidth, opacity, outline, yMin, yMax],
  );

  return (
    <CartesianShell
      {...rest}
      yAxis={yAxisConfig}
      kind="area"
      kindLabel={
        percent ? '100% stacked area chart' : stacked ? 'Stacked area chart' : 'Area chart'
      }
      xKindOption="infer"
      buildSpec={buildSpec}
    />
  );
}
