import { useCallback } from 'react';
import type { CurveType } from '../../internal/curves';
import { toNumber } from '../../internal/format';
import { ActiveDots, LineMarks } from '../../internal/marks';
import { computeDomain } from '../../internal/scales';
import type { CartesianChartProps } from '../../types';
import type { CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { CartesianShell, type SpecInput } from '../CartesianChart/CartesianShell';

export { linePath } from '../../internal/marks';

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
          <LineMarks
            context={context}
            series={context.series}
            curve={curve}
            strokeWidth={strokeWidth}
            connectNulls={connectNulls}
            dots={showDots}
          />
        ),
        renderActive: (context, index) => (
          <ActiveDots context={context} series={context.series} index={index} />
        ),
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
