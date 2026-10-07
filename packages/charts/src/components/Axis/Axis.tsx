import { AXIS_FONT_SIZE, estimateTextWidth } from '../../internal/layout';
import type { AxisTick } from './ticks';

export type AxisOrientation = 'top' | 'bottom' | 'left' | 'right';

export interface AxisProps {
  orientation: AxisOrientation;
  ticks: readonly AxisTick[];
  /** The start and end of the axis line, in pixels along it. */
  range: readonly [number, number];
  /** How far the axis line is from the origin of the plot, across it: a y for `bottom` and `top`, an x for `left` and `right`. */
  offset: number;
  /** How far grid lines reach from the ticks across the plot. 0 draws none. */
  gridLength?: number;
  /** A title for the axis. */
  label?: string;
  /** The length of a tick mark. Defaults to 6. */
  tickSize?: number;
}

const TICK_GAP = 4;

/**
 * An axis drawn in SVG: a line, ticks with labels, optional grid lines and a title. It is
 * decoration for the chart, which is named and described as a whole, so it is hidden from screen
 * readers. `XAxis` and `YAxis` are the usual way in.
 */
export function Axis({
  orientation,
  ticks,
  range,
  offset,
  gridLength = 0,
  label,
  tickSize = 6,
}: AxisProps) {
  const horizontal = orientation === 'top' || orientation === 'bottom';
  const side = orientation === 'bottom' || orientation === 'right' ? 1 : -1;
  const widest = ticks.reduce((max, tick) => Math.max(max, estimateTextWidth(tick.label)), 0);
  const middle = (range[0] + range[1]) / 2;
  const titleDistance = horizontal
    ? tickSize + TICK_GAP + AXIS_FONT_SIZE + 14
    : tickSize + TICK_GAP + widest + 12;

  return (
    <g
      className={`axon-chart__axis axon-chart__axis--${orientation}`}
      transform={horizontal ? `translate(0, ${offset})` : `translate(${offset}, 0)`}
      aria-hidden="true"
    >
      <line
        className="axon-chart__axis-line"
        x1={horizontal ? range[0] : 0}
        x2={horizontal ? range[1] : 0}
        y1={horizontal ? 0 : range[0]}
        y2={horizontal ? 0 : range[1]}
      />
      {ticks.map((tick) => {
        if (!Number.isFinite(tick.position)) return null;
        return (
          <g
            key={`${String(tick.value)}-${tick.position}`}
            transform={
              horizontal ? `translate(${tick.position}, 0)` : `translate(0, ${tick.position})`
            }
          >
            {gridLength > 0 ? (
              <line
                className="axon-chart__grid-line"
                x1={0}
                y1={0}
                x2={horizontal ? 0 : -side * gridLength}
                y2={horizontal ? -side * gridLength : 0}
              />
            ) : null}
            <line
              className="axon-chart__tick-line"
              x1={0}
              y1={0}
              x2={horizontal ? 0 : side * tickSize}
              y2={horizontal ? side * tickSize : 0}
            />
            <text
              className="axon-chart__tick-label"
              x={horizontal ? 0 : side * (tickSize + TICK_GAP)}
              y={horizontal ? side * (tickSize + TICK_GAP) : 0}
              dy={horizontal ? (side === 1 ? '0.8em' : '-0.2em') : '0.32em'}
              textAnchor={horizontal ? 'middle' : side === 1 ? 'start' : 'end'}
            >
              {tick.label}
            </text>
          </g>
        );
      })}
      {label ? (
        <text
          className="axon-chart__axis-title"
          textAnchor="middle"
          x={horizontal ? middle : 0}
          y={horizontal ? side * titleDistance : 0}
          transform={
            horizontal
              ? undefined
              : `translate(${side * titleDistance}, ${middle}) rotate(${side === 1 ? 90 : -90})`
          }
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

export interface XAxisProps extends Omit<AxisProps, 'orientation' | 'offset'> {
  /** Where the axis line sits, as a y. For a bottom axis this is the height of the plot. Defaults to 0. */
  y?: number;
  /** Puts the axis on top of the plot instead of under it. */
  top?: boolean;
}

/** A horizontal axis. Give it ticks from `xScaleTicks` or `yScaleTicks`. */
export function XAxis({ y = 0, top = false, ...rest }: XAxisProps) {
  return <Axis {...rest} orientation={top ? 'top' : 'bottom'} offset={y} />;
}

export interface YAxisProps extends Omit<AxisProps, 'orientation' | 'offset'> {
  /** Where the axis line sits, as an x. For a right axis this is the width of the plot. Defaults to 0. */
  x?: number;
  /** Puts the axis on the right of the plot instead of the left. */
  right?: boolean;
}

/** A vertical axis. Give it ticks from `yScaleTicks` or `xScaleTicks`. */
export function YAxis({ x = 0, right = false, ...rest }: YAxisProps) {
  return <Axis {...rest} orientation={right ? 'right' : 'left'} offset={x} />;
}
