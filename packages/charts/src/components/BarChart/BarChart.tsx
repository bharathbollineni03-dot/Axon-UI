import { useCallback, useMemo } from 'react';
import { createNumberFormatter, toNumber, type ValueFormat } from '../../internal/format';
import { BarMarks } from '../../internal/marks';
import { computeDomain } from '../../internal/scales';
import { stackSeries, type StackedPoint } from '../../internal/stack';
import type { AxisConfig, CartesianChartProps } from '../../types';
import type { CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { CartesianShell, type SpecInput } from '../CartesianChart/CartesianShell';

export interface BarChartProps extends CartesianChartProps {
  /** `vertical` (default) stands bars up from the x axis; `horizontal` lays them along it, for long category names. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Stacks the series in each group on each other: `true` adds them up and `percent` makes each
   * group 100%. Without it the bars of a group stand side by side.
   */
  stacked?: boolean | 'percent';
  /** Rounds the free end of a bar, in pixels. Defaults to 4. Stacks stay square. */
  barRadius?: number;
  /** Space between the bars of a group, as a share of the slot each bar is given. Defaults to 0.1. */
  barPadding?: number;
  /** Space between groups, as a share of a group. Defaults to 0.25. */
  groupPadding?: number;
  /** The thickest a bar may be, in pixels. */
  maxBarSize?: number;
  /** Writes each bar's value at its end. Meant for charts with few bars; ignored for stacks. */
  showValues?: boolean;
  /** Fixes the end of the value axis, whichever way it runs. */
  yMin?: number;
  yMax?: number;
}

const stackedBounds = (stacks: Map<string, StackedPoint[]>): (number | null)[] =>
  [...stacks.values()].flatMap((points) => points.flatMap((point) => [point.y0, point.y1]));

/**
 * Bars for one or more series over categories: grouped, stacked or 100% stacked, standing up or
 * lying down. The value axis always includes zero, so bar lengths can be compared.
 */
export function BarChart({
  orientation = 'vertical',
  stacked = false,
  barRadius = 4,
  barPadding = 0.1,
  groupPadding = 0.25,
  maxBarSize,
  showValues = false,
  yMin,
  yMax,
  yAxis,
  valueFormat,
  ...rest
}: BarChartProps) {
  const horizontal = orientation === 'horizontal';
  const percent = stacked === 'percent';
  const valueLabel = useMemo(
    () => (showValues ? createNumberFormatter(valueFormat as ValueFormat | undefined) : undefined),
    [showValues, valueFormat],
  );

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
            percent ? 'expand' : 'diverging',
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
      return {
        xKind,
        yDomain,
        horizontal,
        bandPadding: groupPadding,
        cursor: 'band',
        renderLayers: (context) => (
          <BarMarks
            context={context}
            series={context.series}
            stacks={stacks}
            radius={barRadius}
            padding={barPadding}
            maxBarSize={maxBarSize}
            valueLabel={valueLabel}
          />
        ),
        anchorValue: stacks
          ? (index) =>
              visible.reduce<number | null>((best, item) => {
                const top = stacks.get(item.key)?.[index]?.y1 ?? null;
                return top !== null && (best === null || top > best) ? top : best;
              }, null)
          : undefined,
      };
    },
    [
      stacked,
      percent,
      horizontal,
      groupPadding,
      barRadius,
      barPadding,
      maxBarSize,
      valueLabel,
      yMin,
      yMax,
    ],
  );

  return (
    <CartesianShell
      {...rest}
      valueFormat={valueFormat}
      yAxis={yAxisConfig}
      kind={horizontal ? 'bar-horizontal' : 'bar'}
      kindLabel={`${percent ? '100% stacked ' : stacked ? 'Stacked ' : ''}${horizontal ? 'horizontal bar' : 'bar'} chart`.replace(
        /^./,
        (c) => c.toUpperCase(),
      )}
      xKindOption="band"
      buildSpec={buildSpec}
    />
  );
}
