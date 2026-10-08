import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useMediaQuery } from '@axon/core';
import { scaleSqrt } from 'd3-scale';
import { DataTable, wantsDataTable } from '../../internal/DataTable';
import { createNumberFormatter, formatValue, toNumber } from '../../internal/format';
import { resolveMargin, type Margin } from '../../internal/layout';
import { chartColor } from '../../internal/palette';
import { computeDomain, createYScale } from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';
import { useSeriesVisibility } from '../../internal/useSeriesVisibility';
import {
  defaultChartLabels,
  type AxisConfig,
  type ChartProps,
  type SeriesChartProps,
} from '../../types';
import { XAxis, YAxis } from '../Axis/Axis';
import { fitTickCount, yScaleTicks } from '../Axis/ticks';
import { ChartFrame } from '../ChartFrame/ChartFrame';
import { Legend } from '../Legend/Legend';
import type { ChartSize } from '../ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent, type TooltipRow } from '../Tooltip/Tooltip';

export interface ScatterChartProps
  extends
    ChartProps,
    Pick<
      SeriesChartProps,
      'legend' | 'hiddenSeries' | 'defaultHiddenSeries' | 'onHiddenSeriesChange'
    > {
  /** The key of the number on the x axis. */
  xKey: string;
  /** The key of the number on the y axis. */
  yKey: string;
  /** The key of a number that sets the size of each point (its area). */
  sizeKey?: string;
  /** The smallest and largest point radius, in pixels, when `sizeKey` is set. Defaults to `[4, 18]`. */
  sizeRange?: readonly [number, number];
  /** The radius of every point when there is no `sizeKey`. Defaults to 5. */
  pointSize?: number;
  /** The key of a category that sets the color of each point and groups them in the legend. */
  colorKey?: string;
  /** Colors for the groups: by group name, or in order. Defaults to the palette. */
  colors?: Record<string, string> | readonly string[];
  /** The key of a name for each point, used as the tooltip's heading. */
  labelKey?: string;
  xAxis?: boolean | AxisConfig;
  yAxis?: boolean | AxisConfig;
  /** Fixes the ends of the x axis. */
  xDomain?: readonly [number, number];
  /** Fixes the ends of the y axis. */
  yDomain?: readonly [number, number];
  /** How solid the points are, 0 to 1. Overlapping points show through when below 1. Defaults to 0.75. */
  opacity?: number;
  /** Called with the row of a point that is pressed or chosen with Enter. */
  onPointClick?: (datum: ChartDatum, index: number) => void;
}

interface Point {
  /** Position in `data`. */
  index: number;
  datum: ChartDatum;
  x: number;
  y: number;
  size: number | null;
  group: string;
  label: string | undefined;
}

const resolveAxis = (axis: boolean | AxisConfig | undefined): AxisConfig =>
  axis === undefined || axis === true ? {} : axis === false ? { show: false } : axis;

/** How near the pointer must be to a point to pick it, beyond the point's own radius. */
const REACH = 10;

/**
 * Points placed by two numbers, optionally sized by a third and colored by a category. Move the
 * pointer near a point, or step through them with the arrow keys (in order along x), to read it.
 */
export function ScatterChart(props: ScatterChartProps) {
  const {
    data,
    xKey,
    yKey,
    sizeKey,
    sizeRange = [4, 18],
    pointSize = 5,
    colorKey,
    colors,
    labelKey,
    xDomain,
    yDomain,
    opacity = 0.75,
    onPointClick,
    height = 340,
    width,
    title,
    description,
    ariaLabel,
    loading,
    emptyState,
    animate = true,
    dataTable,
    locale,
    valueFormat,
    tooltip = true,
    margin: marginOverride,
    labels: labelsProp,
    className,
    style,
    legend,
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  } = props;
  const labels = { ...defaultChartLabels, ...labelsProp };
  const xAxis = resolveAxis(props.xAxis);
  const yAxis = resolveAxis(props.yAxis);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const numberFormat = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);
  const axisFormat = (axis: AxisConfig) =>
    typeof axis.tickFormat === 'string'
      ? createNumberFormatter(axis.tickFormat)
      : typeof axis.tickFormat === 'function'
        ? (axis.tickFormat as (value: number) => string)
        : numberFormat;
  const formatX = axisFormat(xAxis);
  const formatY = axisFormat(yAxis);
  const xName = xAxis.label ?? xKey;
  const yName = yAxis.label ?? yKey;

  // Rows without a number for both axes cannot be placed, so they are left out.
  const points = useMemo<Point[]>(
    () =>
      data.flatMap((datum, index) => {
        const x = toNumber(datum[xKey]);
        const y = toNumber(datum[yKey]);
        if (x === null || y === null) return [];
        return [
          {
            index,
            datum,
            x,
            y,
            size: sizeKey ? toNumber(datum[sizeKey]) : null,
            group: colorKey ? String(datum[colorKey] ?? '') : 'All',
            label: labelKey && datum[labelKey] !== undefined ? String(datum[labelKey]) : undefined,
          },
        ];
      }),
    [data, xKey, yKey, sizeKey, colorKey, labelKey],
  );

  const groups = useMemo(() => {
    const names = [...new Set(points.map((point) => point.group))];
    return names.map((name, index) => ({
      key: name,
      name,
      color: Array.isArray(colors)
        ? (colors[index] ?? chartColor(index))
        : ((colors as Record<string, string> | undefined)?.[name] ?? chartColor(index)),
    }));
  }, [points, colors]);

  const visibility = useSeriesVisibility(groups, {
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  });
  const colorOf = (group: string) =>
    visibility.all.find((item) => item.key === group)?.color ?? chartColor(0);
  const shown = useMemo(
    () => points.filter((point) => !visibility.isHidden(point.group)),
    // `isHidden` follows `hidden`, which is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, visibility.hidden],
  );

  const summary = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    const parts: string[] = [];
    if (title) parts.push(/[.!?]$/.test(title) ? title : `${title}.`);
    if (points.length === 0) {
      parts.push('Scatter chart with no data.');
    } else {
      const [xLow, xHigh] = computeDomain(points.map((point) => point.x));
      const [yLow, yHigh] = computeDomain(points.map((point) => point.y));
      parts.push(
        `Scatter chart of ${points.length} ${points.length === 1 ? 'point' : 'points'}: ${xName} from ${formatX(
          xLow,
        )} to ${formatX(xHigh)} and ${yName} from ${formatY(yLow)} to ${formatY(yHigh)}.`,
      );
      if (colorKey && groups.length > 1) {
        parts.push(`${groups.length} groups: ${groups.map((group) => group.name).join(', ')}.`);
      }
    }
    if (description) parts.push(/[.!?]$/.test(description) ? description : `${description}.`);
    return parts.join(' ');
  }, [ariaLabel, title, description, points, xName, yName, formatX, formatY, colorKey, groups]);

  const showLegend =
    legend === undefined ? Boolean(colorKey) && groups.length > 1 : legend !== false;
  const legendNode = showLegend ? (
    <Legend
      label={labels.legend}
      items={visibility.all.map((item) => ({
        key: item.key,
        name: item.name,
        color: item.color,
        hidden: visibility.isHidden(item.key),
      }))}
      onToggle={visibility.toggle}
      onHighlight={setHighlighted}
    />
  ) : null;

  const tableNode = wantsDataTable(dataTable, points.length) ? (
    <DataTable
      caption={labels.dataTable(title)}
      headers={[
        ...(labelKey ? [labelKey] : []),
        ...(colorKey ? [colorKey] : []),
        xName,
        yName,
        ...(sizeKey ? [sizeKey] : []),
      ]}
      rows={points.map((point) => [
        ...(labelKey ? [point.label ?? ''] : []),
        ...(colorKey ? [point.group] : []),
        formatValue(point.x, formatX, locale),
        formatValue(point.y, formatY, locale),
        ...(sizeKey ? [formatValue(point.size, numberFormat, locale)] : []),
      ])}
    />
  ) : null;

  return (
    <ChartFrame
      kind="scatter"
      width={width}
      height={height}
      loading={loading}
      empty={points.length === 0}
      emptyState={emptyState}
      title={title}
      description={description}
      legend={legendNode}
      legendPosition={legend === 'top' ? 'top' : 'bottom'}
      dataTable={tableNode}
      animate={animate && !reducedMotion}
      labels={labelsProp}
      className={className}
      style={style}
    >
      {(size) => (
        <ScatterPlot
          size={size}
          shown={shown}
          xAxis={xAxis}
          yAxis={yAxis}
          xDomain={xDomain}
          yDomain={yDomain}
          sizeKey={sizeKey}
          sizeRange={sizeRange}
          pointSize={pointSize}
          opacity={opacity}
          colorOf={colorOf}
          highlighted={highlighted}
          xName={xName}
          yName={yName}
          sizeName={sizeKey}
          groupName={colorKey}
          formatX={formatX}
          formatY={formatY}
          numberFormat={numberFormat}
          locale={locale}
          marginOverride={marginOverride}
          tooltip={tooltip}
          ariaLabel={summary}
          labelsProp={labelsProp}
          onPointClick={onPointClick}
        />
      )}
    </ChartFrame>
  );
}

interface ScatterPlotProps {
  size: ChartSize;
  shown: readonly Point[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  xDomain?: readonly [number, number];
  yDomain?: readonly [number, number];
  sizeKey?: string;
  sizeRange: readonly [number, number];
  pointSize: number;
  opacity: number;
  colorOf: (group: string) => string;
  highlighted: string | null;
  xName: string;
  yName: string;
  sizeName?: string;
  groupName?: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  numberFormat: (value: number) => string;
  locale?: string;
  marginOverride?: Partial<Margin>;
  tooltip: boolean;
  ariaLabel: string;
  labelsProp?: ScatterChartProps['labels'];
  onPointClick?: (datum: ChartDatum, index: number) => void;
}

function ScatterPlot({
  size,
  shown,
  xAxis,
  yAxis,
  xDomain,
  yDomain,
  sizeKey,
  sizeRange,
  pointSize,
  opacity,
  colorOf,
  highlighted,
  xName,
  yName,
  sizeName,
  groupName,
  formatX,
  formatY,
  numberFormat,
  locale,
  marginOverride,
  tooltip,
  ariaLabel,
  labelsProp,
  onPointClick,
}: ScatterPlotProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const hintId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const layout = useMemo(() => {
    const showX = xAxis.show !== false;
    const showY = yAxis.show !== false;
    const base = {
      showXAxis: showX,
      xLabel: Boolean(xAxis.label),
      yLabel: Boolean(yAxis.label),
      override: marginOverride,
    };
    const heightMargin = resolveMargin({ ...base, leftLabels: [] });
    const innerHeight = Math.max(0, size.height - heightMargin.top - heightMargin.bottom);

    const yScale = createYScale({
      domain: yDomain ? [yDomain[0], yDomain[1]] : computeDomain(shown.map((point) => point.y)),
      range: [innerHeight, 0],
      nice: !yDomain,
    });
    const yCount =
      yAxis.tickCount ?? Math.max(2, Math.min(8, Math.floor(Math.max(innerHeight, 1) / 50)));
    const yFormat =
      typeof yAxis.tickFormat === 'string' || typeof yAxis.tickFormat === 'function'
        ? yAxis.tickFormat
        : undefined;
    const yTicks = yScaleTicks(yScale, { count: yCount, format: yFormat as never });
    const margin = resolveMargin({
      ...base,
      leftLabels: showY ? yTicks.map((tick) => tick.label) : [],
    });
    const innerWidth = Math.max(0, size.width - margin.left - margin.right);

    const xScale = createYScale({
      domain: xDomain ? [xDomain[0], xDomain[1]] : computeDomain(shown.map((point) => point.x)),
      range: [0, innerWidth],
      nice: !xDomain,
    });
    const xFormat =
      typeof xAxis.tickFormat === 'string' || typeof xAxis.tickFormat === 'function'
        ? xAxis.tickFormat
        : undefined;
    const xCount =
      xAxis.tickCount ??
      fitTickCount(
        (count) => yScaleTicks(xScale, { count, format: xFormat as never }),
        innerWidth,
        { maxCount: 10, gap: 16 },
      );
    const xTicks = yScaleTicks(xScale, { count: xCount, format: xFormat as never });

    const sizes = shown
      .map((point) => point.size)
      .filter((value): value is number => value !== null);
    const [sizeLow, sizeHigh] = computeDomain(sizes);
    const radius = sizeKey
      ? scaleSqrt().domain([sizeLow, sizeHigh]).range([sizeRange[0], sizeRange[1]])
      : null;

    // Big points first, so small ones are not hidden under them.
    const placed = shown
      .map((point) => ({
        point,
        cx: xScale.position(point.x),
        cy: yScale.position(point.y),
        r: radius && point.size !== null ? radius(point.size) : sizeKey ? sizeRange[0] : pointSize,
      }))
      .sort((a, b) => b.r - a.r);
    return { margin, innerWidth, innerHeight, xTicks, yTicks, placed };
  }, [size, shown, xAxis, yAxis, xDomain, yDomain, sizeKey, sizeRange, pointSize, marginOverride]);

  const { margin, innerWidth, innerHeight, xTicks, yTicks, placed } = layout;

  // Keyboard order: left to right, then bottom to top.
  const ordered = useMemo(
    () => [...placed].sort((a, b) => a.point.x - b.point.x || a.point.y - b.point.y),
    [placed],
  );
  const activePlaced =
    active !== null ? placed.find((item) => item.point.index === active) : undefined;

  const rowsFor = (point: Point): TooltipRow[] => [
    { key: 'x', name: xName, value: formatValue(point.x, formatX, locale) },
    { key: 'y', name: yName, value: formatValue(point.y, formatY, locale) },
    ...(sizeName && point.size !== null
      ? [{ key: 'size', name: sizeName, value: formatValue(point.size, numberFormat, locale) }]
      : []),
    ...(groupName
      ? [{ key: 'group', name: groupName, value: point.group, color: colorOf(point.group) }]
      : []),
  ];

  const show = (index: number | null, from: 'pointer' | 'keyboard') => {
    setActive(index);
    setByKeyboard(from === 'keyboard' && index !== null);
  };

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const px = event.clientX - box.left - margin.left;
    const py = event.clientY - box.top - margin.top;
    let best: { index: number; distance: number } | null = null;
    for (const item of placed) {
      const distance = Math.hypot(item.cx - px, item.cy - py);
      if (distance <= item.r + REACH && (!best || distance < best.distance)) {
        best = { index: item.point.index, distance };
      }
    }
    setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
    show(best ? best.index : null, 'pointer');
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const last = ordered.length - 1;
    if (last < 0) return;
    const position =
      active === null ? -1 : ordered.findIndex((item) => item.point.index === active);
    let next = position;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = position === -1 ? 0 : Math.min(last, position + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = position === -1 ? last : Math.max(0, position - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape' && active !== null) {
      event.preventDefault();
      show(null, 'keyboard');
      return;
    } else if ((event.key === 'Enter' || event.key === ' ') && activePlaced && onPointClick) {
      event.preventDefault();
      onPointClick(activePlaced.point.datum, activePlaced.point.index);
      return;
    } else return;
    event.preventDefault();
    const target = ordered[next]!;
    show(target.point.index, 'keyboard');
    setPointer({ x: margin.left + target.cx, y: margin.top + target.cy });
  };

  const announcement =
    byKeyboard && activePlaced
      ? `${activePlaced.point.label ?? activePlaced.point.group}: ${rowsFor(activePlaced.point)
          .map((row) => `${row.name} ${row.value}`)
          .join(', ')}`
      : '';
  const interactive = shown.length > 0;

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
          if (byKeyboard) show(null, 'keyboard');
        }}
      >
        {innerWidth > 0 && innerHeight > 0 ? (
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {yAxis.show !== false ? (
              <YAxis
                ticks={yTicks}
                range={[innerHeight, 0]}
                gridLength={yAxis.grid === false ? 0 : innerWidth}
                label={yAxis.label ?? yName}
              />
            ) : null}
            {xAxis.show !== false ? (
              <XAxis
                ticks={xTicks}
                range={[0, innerWidth]}
                y={innerHeight}
                gridLength={xAxis.grid ? innerHeight : 0}
                label={xAxis.label ?? xName}
              />
            ) : null}
            <g>
              {placed.map((item) => {
                const isActive = active === item.point.index;
                const dimmed =
                  (highlighted !== null && highlighted !== item.point.group) ||
                  (active !== null && !isActive);
                return (
                  <circle
                    key={item.point.index}
                    className={`axon-chart__point${dimmed ? ' axon-chart__dimmed' : ''}`}
                    cx={item.cx}
                    cy={item.cy}
                    r={isActive ? item.r + 2 : item.r}
                    style={{ fill: colorOf(item.point.group), fillOpacity: isActive ? 1 : opacity }}
                    data-active={isActive || undefined}
                  />
                );
              })}
            </g>
            {interactive ? (
              <rect
                className="axon-chart__hit"
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => {
                  if (!byKeyboard) show(null, 'pointer');
                }}
                onClick={() => {
                  if (activePlaced)
                    onPointClick?.(activePlaced.point.datum, activePlaced.point.index);
                }}
              />
            ) : null}
          </g>
        ) : null}
      </svg>
      {tooltip && activePlaced && pointer ? (
        <Tooltip
          x={pointer.x}
          y={pointer.y}
          containerWidth={size.width}
          containerHeight={size.height}
        >
          <TooltipContent
            title={activePlaced.point.label ?? (groupName ? activePlaced.point.group : undefined)}
            rows={rowsFor(activePlaced.point)}
          />
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
