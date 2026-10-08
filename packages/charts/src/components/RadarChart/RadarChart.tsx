import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useMediaQuery } from '@axonui/core';
import { DataTable, wantsDataTable } from '../../internal/DataTable';
import { createNumberFormatter, formatValue, toNumber } from '../../internal/format';
import { estimateTextWidth } from '../../internal/layout';
import { angleOf, polarToCartesian, TAU } from '../../internal/polar';
import { computeDomain, createYScale } from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';
import { valueRange } from '../../internal/summary';
import { useSeriesVisibility } from '../../internal/useSeriesVisibility';
import {
  defaultChartLabels,
  type ChartProps,
  type SeriesChartProps,
  type SeriesInput,
} from '../../types';
import { ChartFrame } from '../ChartFrame/ChartFrame';
import { Legend } from '../Legend/Legend';
import type { ChartSize } from '../ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent } from '../Tooltip/Tooltip';

export interface RadarChartProps
  extends
    ChartProps,
    Pick<
      SeriesChartProps,
      'legend' | 'hiddenSeries' | 'defaultHiddenSeries' | 'onHiddenSeriesChange'
    > {
  /** The key of each axis' name: one row per spoke. */
  axisKey: string;
  /** The values drawn as shapes: one series per shape. */
  series: readonly SeriesInput[];
  /** The value at the centre. Defaults to 0. */
  min?: number;
  /** The value at the outer ring. Defaults to the highest value, rounded up. */
  max?: number;
  /** About how many rings to draw. Defaults to 4. */
  levels?: number;
  /** How solid each shape's fill is, 0 to 1. Defaults to 0.2. */
  fillOpacity?: number;
  /** Dots at the corners of each shape. Defaults to true. */
  dots?: boolean;
  strokeWidth?: number;
  /** Called with the row of an axis that is pressed or chosen with Enter. */
  onPointClick?: (datum: ChartDatum, index: number) => void;
}

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * Several measures of one thing on spokes round a centre, joined into a shape per series: a
 * team's skills, a product's scores. Move the pointer round the chart, or use the arrow keys, to
 * read the values on one spoke at a time.
 */
export function RadarChart(props: RadarChartProps) {
  const {
    data,
    axisKey,
    series,
    min = 0,
    max,
    levels = 4,
    fillOpacity = 0.2,
    dots = true,
    strokeWidth = 2,
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
    labels: labelsProp,
    className,
    style,
    legend,
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  } = props;
  const labels = { ...defaultChartLabels, ...labelsProp };
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const numberFormat = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);
  const visibility = useSeriesVisibility(series, {
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  });

  const summary = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    const axes = data.map((datum) => String(datum[axisKey] ?? ''));
    const parts: string[] = [];
    if (title) parts.push(sentence(title));
    if (data.length === 0) {
      parts.push('Radar chart with no data.');
    } else {
      parts.push(
        `Radar chart with ${axes.length} ${axes.length === 1 ? 'axis' : 'axes'}: ${axes.join(', ')}.`,
      );
      if (visibility.visible.length <= 3) {
        for (const item of visibility.visible) {
          const range = valueRange(data, axisKey, item.key);
          if (!range) continue;
          parts.push(
            `${item.name} is highest on ${axes[range.high.index]} (${numberFormat(range.high.value)}) and lowest on ${axes[range.low.index]} (${numberFormat(range.low.value)}).`,
          );
        }
      } else {
        parts.push(
          `${visibility.visible.length} series: ${visibility.visible.map((item) => item.name).join(', ')}.`,
        );
      }
    }
    if (description) parts.push(sentence(description));
    return parts.join(' ');
  }, [ariaLabel, title, description, data, axisKey, visibility.visible, numberFormat]);

  const showLegend = legend === undefined ? series.length > 1 : legend !== false;
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

  const tableNode = wantsDataTable(dataTable, data.length) ? (
    <DataTable
      caption={labels.dataTable(title)}
      headers={[axisKey, ...visibility.all.map((item) => item.name)]}
      rows={data.map((datum) => [
        String(datum[axisKey] ?? ''),
        ...visibility.all.map((item) =>
          formatValue(toNumber(datum[item.key]), numberFormat, locale),
        ),
      ])}
    />
  ) : null;

  return (
    <ChartFrame
      kind="radar"
      width={width}
      height={height}
      loading={loading}
      empty={data.length === 0}
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
        <RadarPlot
          size={size}
          data={data}
          axisKey={axisKey}
          visible={visibility.visible}
          min={min}
          max={max}
          levels={levels}
          fillOpacity={fillOpacity}
          dots={dots}
          strokeWidth={strokeWidth}
          highlighted={highlighted}
          numberFormat={numberFormat}
          locale={locale}
          tooltip={tooltip}
          ariaLabel={summary}
          labelsProp={labelsProp}
          onPointClick={onPointClick}
        />
      )}
    </ChartFrame>
  );
}

interface RadarPlotProps {
  size: ChartSize;
  data: readonly ChartDatum[];
  axisKey: string;
  visible: ReturnType<typeof useSeriesVisibility<SeriesInput>>['visible'];
  min: number;
  max?: number;
  levels: number;
  fillOpacity: number;
  dots: boolean;
  strokeWidth: number;
  highlighted: string | null;
  numberFormat: (value: number) => string;
  locale?: string;
  tooltip: boolean;
  ariaLabel: string;
  labelsProp?: RadarChartProps['labels'];
  onPointClick?: (datum: ChartDatum, index: number) => void;
}

function RadarPlot({
  size,
  data,
  axisKey,
  visible,
  min,
  max,
  levels,
  fillOpacity,
  dots,
  strokeWidth,
  highlighted,
  numberFormat,
  locale,
  tooltip,
  ariaLabel,
  labelsProp,
  onPointClick,
}: RadarPlotProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const hintId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const count = data.length;
  const names = data.map((datum) => String(datum[axisKey] ?? ''));
  const widest = names.reduce((best, name) => Math.max(best, estimateTextWidth(name)), 0);
  const cx = size.width / 2;
  const cy = size.height / 2;
  const radius = Math.max(
    0,
    Math.min(size.width / 2 - Math.min(widest, size.width * 0.3) - 16, size.height / 2 - 30),
  );

  const scale = useMemo(() => {
    const values = visible.flatMap((item) => data.map((datum) => toNumber(datum[item.key])));
    const [low, high] = computeDomain(values, { min, max });
    return createYScale({ domain: [low, high], range: [0, radius], nice: max === undefined });
  }, [visible, data, min, max, radius]);

  const angleAt = (index: number) => (count > 0 ? (TAU * index) / count : 0);
  const ringTicks = scale.ticks(levels).filter((tick) => tick > scale.domain[0]);
  const ringFormat = scale.tickFormat(levels);
  const polygonFor = (radiusOf: (index: number) => number) =>
    data
      .map((_, index) => {
        const point = polarToCartesian(cx, cy, radiusOf(index), angleAt(index));
        return `${point.x},${point.y}`;
      })
      .join(' ');

  const rowsFor = (index: number) =>
    visible.map((item) => ({
      key: item.key,
      name: item.name,
      color: item.color,
      value: formatValue(toNumber(data[index]?.[item.key]), numberFormat, locale),
    }));

  const show = (index: number | null, from: 'pointer' | 'keyboard') => {
    setActive(index);
    setByKeyboard(from === 'keyboard' && index !== null);
  };

  const anchorOf = (index: number) => {
    const best = visible.reduce(
      (top, item) => Math.max(top, toNumber(data[index]?.[item.key]) ?? scale.domain[0]),
      scale.domain[0],
    );
    return polarToCartesian(cx, cy, scale.position(best), angleAt(index));
  };

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || count === 0) return;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const index = Math.round(angleOf(cx, cy, x, y) / (TAU / count)) % count;
    setPointer({ x, y });
    show(index, 'pointer');
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const last = count - 1;
    if (last < 0) return;
    let next: number | null = active;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = active === null ? 0 : (active + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = active === null ? last : (active - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape' && active !== null) {
      event.preventDefault();
      show(null, 'keyboard');
      return;
    } else if ((event.key === 'Enter' || event.key === ' ') && active !== null && onPointClick) {
      event.preventDefault();
      onPointClick(data[active]!, active);
      return;
    } else return;
    event.preventDefault();
    show(next, 'keyboard');
    if (next !== null) setPointer(anchorOf(next));
  };

  const announcement =
    byKeyboard && active !== null
      ? `${names[active]}: ${rowsFor(active)
          .map((row) => `${row.name} ${row.value}`)
          .join(', ')}`
      : '';
  const interactive = count > 0;

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
        {radius > 0 && count > 0 ? (
          <g>
            {ringTicks.map((tick) => (
              <polygon
                key={tick}
                className="axon-chart__radar-ring"
                points={polygonFor(() => scale.position(tick))}
              />
            ))}
            {names.map((name, index) => {
              const end = polarToCartesian(cx, cy, radius, angleAt(index));
              return (
                <line
                  key={`${name}-${index}`}
                  className={`axon-chart__radar-spoke${active === index ? ' axon-chart__radar-spoke--active' : ''}`}
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                />
              );
            })}
            {ringTicks.map((tick) => (
              <text
                key={`label-${tick}`}
                className="axon-chart__tick-label"
                x={cx + 4}
                y={cy - scale.position(tick)}
                dy="-0.25em"
              >
                {ringFormat(tick)}
              </text>
            ))}
            {names.map((name, index) => {
              const angle = angleAt(index);
              const point = polarToCartesian(cx, cy, radius + 12, angle);
              const horizontal = Math.sin(angle);
              return (
                <text
                  key={`axis-${name}-${index}`}
                  className={`axon-chart__radar-label${active === index ? ' axon-chart__radar-label--active' : ''}`}
                  x={point.x}
                  y={point.y}
                  dy={
                    Math.cos(angle) > 0.3 ? '-0.35em' : Math.cos(angle) < -0.3 ? '0.95em' : '0.32em'
                  }
                  textAnchor={horizontal > 0.2 ? 'start' : horizontal < -0.2 ? 'end' : 'middle'}
                >
                  {name}
                </text>
              );
            })}
            {visible.map((item) => {
              const dimmed = highlighted !== null && highlighted !== item.key;
              const radiusOf = (index: number) =>
                scale.position(toNumber(data[index]?.[item.key]) ?? scale.domain[0]);
              return (
                <g key={item.key} className={dimmed ? 'axon-chart__dimmed' : undefined}>
                  <polygon
                    className="axon-chart__radar-area"
                    points={polygonFor(radiusOf)}
                    style={{ fill: item.color, fillOpacity, stroke: item.color, strokeWidth }}
                  />
                  {dots
                    ? data.map((_, index) => {
                        const point = polarToCartesian(cx, cy, radiusOf(index), angleAt(index));
                        return (
                          <circle
                            key={index}
                            className="axon-chart__dot axon-chart__dot--static"
                            cx={point.x}
                            cy={point.y}
                            r={active === index ? 5 : 3}
                            style={{ fill: item.color }}
                          />
                        );
                      })
                    : null}
                </g>
              );
            })}
            {interactive ? (
              <rect
                className="axon-chart__hit"
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                fill="transparent"
                onPointerMove={handlePointer}
                onPointerDown={handlePointer}
                onPointerLeave={() => {
                  if (!byKeyboard) show(null, 'pointer');
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
          x={pointer.x}
          y={pointer.y}
          containerWidth={size.width}
          containerHeight={size.height}
        >
          <TooltipContent title={names[active]} rows={rowsFor(active)} />
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
