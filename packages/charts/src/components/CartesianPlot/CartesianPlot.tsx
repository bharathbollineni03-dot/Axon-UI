import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  createNumberFormatter,
  createXFormatter,
  formatValue,
  toNumber,
  type ValueFormat,
} from '../../internal/format';
import { resolveMargin, type Margin } from '../../internal/layout';
import type { ResolvedSeries } from '../../internal/palette';
import {
  createXScale,
  createYScale,
  nearestIndex,
  type XScale,
  type XScaleKind,
  type YScale,
} from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';
import { defaultChartLabels, type AxisConfig, type ChartLabels } from '../../types';
import { XAxis, YAxis } from '../Axis/Axis';
import { fitTickCount, xScaleTicks, yScaleTicks } from '../Axis/ticks';
import { CrosshairCursor } from '../CrosshairCursor/CrosshairCursor';
import type { ChartSize } from '../ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent, type TooltipRow } from '../Tooltip/Tooltip';

/** What a chart's marks are drawn from: the scales, the data and what is being looked at. */
export interface CartesianLayerContext {
  /** The size of the plot area, inside the axes. */
  width: number;
  height: number;
  /** True for horizontal bars, where categories run down the left and values along the bottom. */
  horizontal: boolean;
  /** Places the x values (categories, numbers or dates). */
  category: XScale;
  /** Places values on the main value axis (the left one, or the bottom one for horizontal bars). */
  value: YScale;
  /** Places values on a second, right-hand value axis. */
  value2?: YScale;
  data: readonly ChartDatum[];
  xKey: string;
  /** The middle of each row along the category direction, in pixels. */
  positions: readonly number[];
  /** The series that are showing. */
  series: readonly ResolvedSeries[];
  highlighted: string | null;
  animate: boolean;
}

/** How a chart type tells `CartesianPlot` what to draw. Build it with `useMemo`: the layers it draws are cached until it changes. */
export interface CartesianSpec {
  /** How the x values are placed. Bars use `band`. */
  xKind: XScaleKind;
  /** The main value axis' domain. */
  yDomain: [number, number];
  /** A second value axis on the right. */
  y2Domain?: [number, number];
  horizontal?: boolean;
  bandPadding?: number;
  outerPadding?: number;
  /** Rounds the value axis out to nice numbers. Defaults to true. */
  yNice?: boolean;
  /** What marks the row being looked at: a `line` through it, a `band` behind it, or `none`. Defaults to `line`. */
  cursor?: 'line' | 'band' | 'none';
  /** The marks that do not depend on what is being looked at: lines, areas, bars. */
  renderLayers: (context: CartesianLayerContext) => ReactNode;
  /** Marks for the row being looked at, such as dots on the lines. */
  renderActive?: (context: CartesianLayerContext, index: number) => ReactNode;
  /** The values shown in the tooltip for a row. Defaults to each shown series' own value. */
  tooltipValues?: (index: number) => { key: string; value: number | null }[];
  /** A value on the main axis to anchor a keyboard-opened tooltip to. Defaults to the highest series value. */
  anchorValue?: (index: number) => number | null;
}

export interface CartesianPlotProps {
  size: ChartSize;
  data: readonly ChartDatum[];
  xKey: string;
  /** Every series, shown or not, so the tooltip and names stay stable. */
  allSeries: readonly ResolvedSeries[];
  visibleSeries: readonly ResolvedSeries[];
  spec: CartesianSpec;
  /** Settings for the x (category) axis. */
  xAxis: AxisConfig;
  /** Settings for the main value axis. */
  yAxis: AxisConfig;
  /** Settings for the right-hand value axis, when `spec` has a `y2Domain`. */
  y2Axis?: AxisConfig;
  margin?: Partial<Margin>;
  locale?: string;
  valueFormat?: ValueFormat;
  tooltip: boolean;
  ariaLabel: string;
  labels?: Partial<ChartLabels>;
  animate: boolean;
  highlighted: string | null;
  onPointClick?: (datum: ChartDatum, index: number) => void;
}

interface Layout {
  margin: Margin;
  context: CartesianLayerContext;
  categoryTicks: ReturnType<typeof xScaleTicks>;
  valueTicks: ReturnType<typeof yScaleTicks>;
  value2Ticks: ReturnType<typeof yScaleTicks>;
}

function computeLayout(props: CartesianPlotProps): Layout {
  const { size, data, xKey, visibleSeries, spec, xAxis, yAxis, y2Axis, locale, animate } = props;
  const horizontal = spec.horizontal ?? false;
  const showCategory = xAxis.show !== false;
  const showValue = yAxis.show !== false;
  const hasValue2 = Boolean(spec.y2Domain);
  const showValue2 = hasValue2 && y2Axis?.show !== false;
  const xValues = data.map((datum) => datum[xKey]);

  const baseInput = (leftLabels: string[], rightLabels: string[]) =>
    horizontal
      ? {
          leftLabels: showCategory ? leftLabels : [],
          showXAxis: showValue,
          xLabel: Boolean(yAxis.label),
          yLabel: Boolean(xAxis.label),
          override: props.margin,
        }
      : {
          leftLabels: showValue ? leftLabels : [],
          rightLabels: showValue2 ? rightLabels : [],
          showXAxis: showCategory,
          xLabel: Boolean(xAxis.label),
          yLabel: Boolean(yAxis.label),
          y2Label: Boolean(y2Axis?.label),
          override: props.margin,
        };

  // Value axes format numbers, the x axis any value; the config type allows both for either.
  const valueFormatOption = yAxis.tickFormat as ValueFormat | undefined;
  const value2FormatOption = y2Axis?.tickFormat as ValueFormat | undefined;
  const categoryFormatOption = xAxis.tickFormat as
    string | ((value: unknown) => string) | undefined;

  // The top and bottom margins do not depend on label widths, so the plot's height is known first.
  const heightMargin = resolveMargin(baseInput([], []));
  const innerHeight = Math.max(0, size.height - heightMargin.top - heightMargin.bottom);
  const valueSpan = horizontal ? 1 : innerHeight;

  const makeValueScale = (domain: [number, number], range: [number, number]) =>
    createYScale({ domain, range, nice: spec.yNice ?? true });

  // The widest labels decide the left (and right) margin, so make the value scale first.
  const provisionalValue = makeValueScale(spec.yDomain, [valueSpan, 0]);
  const provisionalValue2 = spec.y2Domain
    ? makeValueScale(spec.y2Domain, [valueSpan, 0])
    : undefined;
  const valueCount =
    yAxis.tickCount ?? Math.max(2, Math.min(8, Math.floor(Math.max(innerHeight, 1) / 50)));
  const valueLabels = yScaleTicks(provisionalValue, {
    count: valueCount,
    format: valueFormatOption,
  }).map((tick) => tick.label);
  const value2Labels = provisionalValue2
    ? yScaleTicks(provisionalValue2, {
        count: y2Axis?.tickCount ?? valueCount,
        format: value2FormatOption,
      }).map((tick) => tick.label)
    : [];
  const categoryProbe = createXScale({ values: xValues, kind: spec.xKind, range: [0, 1] });
  const categoryLabels = horizontal
    ? xScaleTicks(categoryProbe, { format: categoryFormatOption, locale }).map((tick) => tick.label)
    : [];

  const margin = resolveMargin(
    horizontal ? baseInput(categoryLabels, []) : baseInput(valueLabels, value2Labels),
  );
  const innerWidth = Math.max(0, size.width - margin.left - margin.right);
  const innerH = Math.max(0, size.height - margin.top - margin.bottom);

  const category = createXScale({
    values: xValues,
    kind: spec.xKind,
    range: horizontal ? [0, innerH] : [0, innerWidth],
    bandPadding: spec.bandPadding,
    outerPadding: spec.outerPadding,
  });
  const value = makeValueScale(spec.yDomain, horizontal ? [0, innerWidth] : [innerH, 0]);
  const value2 = spec.y2Domain
    ? makeValueScale(spec.y2Domain, horizontal ? [0, innerWidth] : [innerH, 0])
    : undefined;

  const categoryCount = (length: number, gap: number) =>
    xAxis.tickCount ??
    (horizontal
      ? Math.max(2, Math.floor(length / 18))
      : fitTickCount(
          (count) => xScaleTicks(category, { count, format: categoryFormatOption, locale }),
          length,
          {
            gap,
            // Every category may get a label if they fit; numbers and dates use about ten.
            maxCount:
              category.kind === 'band' || category.kind === 'point'
                ? Math.max(2, category.domain.length)
                : 10,
          },
        ));
  const categoryTicks = xScaleTicks(category, {
    count: categoryCount(horizontal ? innerH : innerWidth, 12),
    format: categoryFormatOption,
    locale,
  });
  const valueTickCount = horizontal
    ? (yAxis.tickCount ??
      fitTickCount(
        (count) => yScaleTicks(value, { count, format: valueFormatOption }),
        innerWidth,
        { maxCount: 8, gap: 16 },
      ))
    : valueCount;
  const valueTicks = yScaleTicks(value, {
    count: valueTickCount,
    format: valueFormatOption,
  });
  const value2Ticks = value2
    ? yScaleTicks(value2, {
        count: y2Axis?.tickCount ?? valueTickCount,
        format: value2FormatOption,
      })
    : [];

  const positions = xValues.map((x) => category.position(x));
  return {
    margin,
    categoryTicks,
    valueTicks,
    value2Ticks,
    context: {
      width: innerWidth,
      height: innerH,
      horizontal,
      category,
      value,
      value2,
      data,
      xKey,
      positions,
      series: visibleSeries,
      highlighted: props.highlighted,
      animate,
    },
  };
}

/**
 * The plot of a chart with an x axis: it lays out the axes, builds the scales, draws the grid and
 * the marks its `spec` asks for, and handles the pointer and keyboard. The line, area, bar and
 * combo charts are all this with a different `spec`.
 *
 * The chart is one `role="img"` named by `ariaLabel`. It takes focus; the arrow keys step through
 * the rows, showing the tooltip and announcing the row in a live region, Home and End jump to the
 * ends, Enter chooses the row and Escape lets go.
 */
export function CartesianPlot(props: CartesianPlotProps) {
  const {
    size,
    data,
    xKey,
    allSeries,
    visibleSeries,
    spec,
    xAxis,
    yAxis,
    y2Axis,
    locale,
    valueFormat,
    tooltip,
    ariaLabel,
    labels: labelsProp,
    onPointClick,
  } = props;
  const labels = { ...defaultChartLabels, ...labelsProp };
  const hintId = useId();
  const tooltipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const layout = useMemo(
    () => computeLayout(props),
    // `props` is read as a whole on purpose: the layout depends on nearly all of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      size.width,
      size.height,
      data,
      xKey,
      visibleSeries,
      spec,
      xAxis,
      yAxis,
      y2Axis,
      props.margin,
      locale,
      props.animate,
      props.highlighted,
    ],
  );
  const { margin, context, categoryTicks, valueTicks, value2Ticks } = layout;
  const { horizontal, width: innerWidth, height: innerHeight, positions } = context;

  const layers = useMemo(() => spec.renderLayers(context), [spec, context]);

  const numberFormat = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);
  const formatX = useMemo(
    () =>
      createXFormatter(
        xAxis.tickFormat as string | ((value: unknown) => string) | undefined,
        locale,
      ),
    [xAxis.tickFormat, locale],
  );

  const tooltipRows = (index: number): TooltipRow[] => {
    const values =
      spec.tooltipValues?.(index) ??
      visibleSeries.map((item) => ({ key: item.key, value: toNumber(data[index]?.[item.key]) }));
    return values.flatMap(({ key, value }) => {
      const item = allSeries.find((candidate) => candidate.key === key);
      return item
        ? [
            {
              key,
              name: item.name,
              color: item.color,
              value: formatValue(value, numberFormat, locale),
            },
          ]
        : [];
    });
  };

  const showAt = (index: number | null, from: 'pointer' | 'keyboard') => {
    setActive(index);
    setByKeyboard(from === 'keyboard' && index !== null);
  };

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const index = nearestIndex(positions, horizontal ? y - margin.top : x - margin.left);
    if (index === -1) return;
    setPointer({ x, y });
    showAt(index, 'pointer');
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const last = data.length - 1;
    if (last < 0) return;
    const forward = horizontal ? ['ArrowDown', 'ArrowRight'] : ['ArrowRight'];
    const backward = horizontal ? ['ArrowUp', 'ArrowLeft'] : ['ArrowLeft'];
    let next: number | null = active;
    if (forward.includes(event.key)) next = active === null ? 0 : Math.min(last, active + 1);
    else if (backward.includes(event.key)) next = active === null ? last : Math.max(0, active - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape' && active !== null) {
      event.preventDefault();
      showAt(null, 'keyboard');
      return;
    } else if ((event.key === 'Enter' || event.key === ' ') && active !== null && onPointClick) {
      event.preventDefault();
      onPointClick(data[active]!, active);
      return;
    } else return;

    event.preventDefault();
    showAt(next, 'keyboard');
    if (next !== null) {
      const anchorValue = spec.anchorValue
        ? spec.anchorValue(next)
        : maxValueAt(visibleSeries, data[next]!);
      const along = positions[next] ?? 0;
      const across =
        anchorValue === null || anchorValue === undefined ? 0 : context.value.position(anchorValue);
      setPointer(
        horizontal
          ? { x: margin.left + across, y: margin.top + along }
          : { x: margin.left + along, y: margin.top + across },
      );
    }
  };

  const activeRows = active !== null ? tooltipRows(active) : [];
  const activeTitle = active !== null ? formatX(data[active]?.[xKey]) : '';
  const announcement =
    byKeyboard && active !== null
      ? `${activeTitle}: ${activeRows.map((row) => `${row.name} ${row.value}`).join(', ')}`
      : '';
  const interactive = data.length > 0;

  const cursor = spec.cursor ?? 'line';
  const activePosition = active !== null ? positions[active] : undefined;

  return (
    <>
      {/* The chart is one image to assistive technology; it still has to take focus so the arrow keys can step through it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */}
      <svg
        ref={svgRef}
        className="axon-chart__svg"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label={ariaLabel}
        aria-describedby={interactive ? hintId : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? handleKeyDown : undefined}
        onBlur={() => {
          if (byKeyboard) showAt(null, 'keyboard');
        }}
      >
        {innerWidth > 0 && innerHeight > 0 ? (
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {horizontal ? (
              <>
                {xAxis.show !== false ? (
                  <YAxis
                    ticks={categoryTicks}
                    range={[0, innerHeight]}
                    gridLength={xAxis.grid ? innerWidth : 0}
                    label={xAxis.label}
                  />
                ) : null}
                {yAxis.show !== false ? (
                  <XAxis
                    ticks={valueTicks}
                    range={[0, innerWidth]}
                    y={innerHeight}
                    gridLength={yAxis.grid === false ? 0 : innerHeight}
                    label={yAxis.label}
                  />
                ) : null}
              </>
            ) : (
              <>
                {yAxis.show !== false ? (
                  <YAxis
                    ticks={valueTicks}
                    range={[innerHeight, 0]}
                    gridLength={yAxis.grid === false ? 0 : innerWidth}
                    label={yAxis.label}
                  />
                ) : null}
                {spec.y2Domain && y2Axis?.show !== false ? (
                  <YAxis
                    right
                    x={innerWidth}
                    ticks={value2Ticks}
                    range={[innerHeight, 0]}
                    label={y2Axis?.label}
                  />
                ) : null}
                {xAxis.show !== false ? (
                  <XAxis
                    ticks={categoryTicks}
                    range={[0, innerWidth]}
                    y={innerHeight}
                    gridLength={xAxis.grid ? innerHeight : 0}
                    label={xAxis.label}
                  />
                ) : null}
              </>
            )}

            {active !== null && cursor === 'band' && activePosition !== undefined ? (
              <rect
                className="axon-chart__cursor-band"
                {...(horizontal
                  ? {
                      x: 0,
                      y: activePosition - context.category.step / 2,
                      width: innerWidth,
                      height: context.category.step,
                    }
                  : {
                      x: activePosition - context.category.step / 2,
                      y: 0,
                      width: context.category.step,
                      height: innerHeight,
                    })}
              />
            ) : null}
            {layers}
            {active !== null && cursor === 'line' && activePosition !== undefined ? (
              <CrosshairCursor
                position={activePosition}
                length={horizontal ? innerWidth : innerHeight}
                orientation={horizontal ? 'horizontal' : 'vertical'}
              />
            ) : null}
            {active !== null ? spec.renderActive?.(context, active) : null}
            {interactive ? (
              <rect
                className="axon-chart__hit"
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => {
                  if (!byKeyboard) showAt(null, 'pointer');
                }}
                onClick={() => {
                  if (active !== null) onPointClick?.(data[active]!, active);
                }}
              />
            ) : null}
          </g>
        ) : null}
      </svg>
      {tooltip && active !== null && pointer ? (
        <Tooltip
          id={tooltipId}
          x={pointer.x}
          y={pointer.y}
          containerWidth={size.width}
          containerHeight={size.height}
        >
          <TooltipContent title={activeTitle} rows={activeRows} />
        </Tooltip>
      ) : null}
      {interactive ? (
        <span id={hintId} className="axon-visually-hidden">
          {labels.keyboardHint}
        </span>
      ) : null}
      <span className="axon-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

/** The highest value among the shown series in one row, or `null`. */
function maxValueAt(series: readonly ResolvedSeries[], datum: ChartDatum): number | null {
  let best: number | null = null;
  for (const item of series) {
    const value = toNumber(datum[item.key]);
    if (value !== null && (best === null || value > best)) best = value;
  }
  return best;
}
