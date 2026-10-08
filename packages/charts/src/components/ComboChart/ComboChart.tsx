import { useCallback } from 'react';
import type { CurveType } from '../../internal/curves';
import { toNumber } from '../../internal/format';
import { ActiveDots, AreaMarks, BarMarks, LineMarks } from '../../internal/marks';
import type { ResolvedSeries, SeriesInput } from '../../internal/palette';
import { computeDomain } from '../../internal/scales';
import { stackSeries, type StackedPoint } from '../../internal/stack';
import type { AxisConfig, CartesianChartProps } from '../../types';
import type { CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { CartesianShell, type SpecInput } from '../CartesianChart/CartesianShell';

export interface ComboSeries extends SeriesInput {
  /** How the series is drawn. Defaults to `bar`. */
  type?: 'bar' | 'line' | 'area';
  /** Which value axis it is measured on. Defaults to `left`. */
  axis?: 'left' | 'right';
}

export interface ComboChartProps extends Omit<CartesianChartProps, 'series'> {
  /** Each series says how it is drawn and which axis it uses. */
  series: readonly ComboSeries[];
  /** The right-hand value axis, for series with `axis: 'right'`. */
  y2Axis?: boolean | AxisConfig;
  /** Stacks the bar series on each other. */
  stackedBars?: boolean;
  /** How lines and areas run between points. Defaults to `linear`. */
  curve?: CurveType;
  /** Dots on the points of lines: `true`, `false`, or `auto` (the default) for 30 points or fewer. */
  dots?: boolean | 'auto';
  strokeWidth?: number;
  connectNulls?: boolean;
  barRadius?: number;
  barPadding?: number;
  groupPadding?: number;
  maxBarSize?: number;
  /** How solid area fills are. Defaults to 0.2. */
  fillOpacity?: number;
}

type Resolved = ResolvedSeries & ComboSeries;

const typeOf = (item: ComboSeries) => item.type ?? 'bar';
const stackedBounds = (stacks: Map<string, StackedPoint[]>): (number | null)[] =>
  [...stacks.values()].flatMap((points) => points.flatMap((point) => [point.y0, point.y1]));

/**
 * Bars, lines and areas on one chart, with a second value axis on the right for series that
 * are measured in other units: revenue as bars against a conversion rate as a line.
 */
export function ComboChart({
  series,
  stackedBars = false,
  curve = 'linear',
  dots = 'auto',
  strokeWidth = 2,
  connectNulls = false,
  barRadius = 4,
  barPadding = 0.1,
  groupPadding = 0.25,
  maxBarSize,
  fillOpacity = 0.2,
  ...rest
}: ComboChartProps) {
  const hasBars = series.some((item) => typeOf(item) === 'bar');

  const buildSpec = useCallback(
    ({ visible, data, xKind }: SpecInput): CartesianSpec => {
      const shown = visible as Resolved[];
      const onRight = (item: Resolved) => item.axis === 'right';
      const bars = shown.filter((item) => typeOf(item) === 'bar');
      const lines = shown.filter((item) => typeOf(item) === 'line');
      const areas = shown.filter((item) => typeOf(item) === 'area');
      const barStacks =
        stackedBars && bars.length
          ? stackSeries(
              data,
              bars.map((item) => item.key),
              'diverging',
            )
          : undefined;

      const domainFor = (side: Resolved[]) => {
        const values: (number | null)[] = side.flatMap((item) => {
          if (barStacks && typeOf(item) === 'bar') return [];
          return data.map((datum) => toNumber(datum[item.key]));
        });
        if (barStacks && side.some((item) => typeOf(item) === 'bar' && !onRight(item))) {
          values.push(...stackedBounds(barStacks));
        }
        return computeDomain(values, {
          includeZero: side.some((item) => typeOf(item) !== 'line'),
        });
      };
      const left = shown.filter((item) => !onRight(item));
      const right = shown.filter(onRight);
      const showDots = dots === 'auto' ? data.length <= 30 : dots;

      return {
        xKind,
        yDomain: domainFor(left),
        y2Domain: right.length ? domainFor(right) : undefined,
        bandPadding: groupPadding,
        cursor: hasBars ? 'band' : 'line',
        renderLayers: (context) => {
          const scaleFor = (item: ResolvedSeries) =>
            onRight(item as Resolved) ? (context.value2 ?? context.value) : context.value;
          return (
            <g>
              {areas.length ? (
                <AreaMarks
                  context={context}
                  series={areas}
                  scaleFor={scaleFor}
                  curve={curve}
                  strokeWidth={strokeWidth}
                  fillOpacity={fillOpacity}
                  outline
                />
              ) : null}
              {bars.length ? (
                <BarMarks
                  context={context}
                  series={bars}
                  scaleFor={scaleFor}
                  stacks={barStacks}
                  radius={barRadius}
                  padding={barPadding}
                  maxBarSize={maxBarSize}
                />
              ) : null}
              {lines.length ? (
                <LineMarks
                  context={context}
                  series={lines}
                  scaleFor={scaleFor}
                  curve={curve}
                  strokeWidth={strokeWidth}
                  connectNulls={connectNulls}
                  dots={showDots}
                />
              ) : null}
            </g>
          );
        },
        renderActive: (context, index) => (
          <ActiveDots
            context={context}
            series={[...lines, ...areas]}
            index={index}
            scaleFor={(item) =>
              onRight(item as Resolved) ? (context.value2 ?? context.value) : context.value
            }
          />
        ),
        anchorValue: (index) =>
          left.reduce<number | null>((best, item) => {
            const value = toNumber(data[index]?.[item.key]);
            return value !== null && (best === null || value > best) ? value : best;
          }, null),
      };
    },
    [
      stackedBars,
      curve,
      dots,
      strokeWidth,
      connectNulls,
      barRadius,
      barPadding,
      groupPadding,
      maxBarSize,
      fillOpacity,
      hasBars,
    ],
  );

  return (
    <CartesianShell
      {...rest}
      series={series}
      kind="combo"
      kindLabel="Combination chart"
      xKindOption={hasBars ? 'band' : 'infer'}
      buildSpec={buildSpec}
    />
  );
}
