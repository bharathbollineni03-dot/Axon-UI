import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useMediaQuery } from '@axon/core';
import { DataTable, wantsDataTable } from '../../internal/DataTable';
import { createNumberFormatter, formatPercent, formatValue, toNumber } from '../../internal/format';
import {
  arcPath,
  layoutPie,
  leaderLine,
  polarToCartesian,
  spreadLabels,
  toRadians,
} from '../../internal/polar';
import { chartColor } from '../../internal/palette';
import type { ChartDatum } from '../../internal/stack';
import { describePie } from '../../internal/summary';
import { useSeriesVisibility } from '../../internal/useSeriesVisibility';
import {
  defaultChartLabels,
  type ChartLabels,
  type ChartProps,
  type SeriesChartProps,
} from '../../types';
import { ChartFrame } from '../ChartFrame/ChartFrame';
import { Legend } from '../Legend/Legend';
import type { ChartSize } from '../ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent } from '../Tooltip/Tooltip';

export interface PieChartProps
  extends
    ChartProps,
    Pick<
      SeriesChartProps,
      'legend' | 'hiddenSeries' | 'defaultHiddenSeries' | 'onHiddenSeriesChange'
    > {
  /** The key of each slice's name. Defaults to `name`. */
  nameKey?: string;
  /** The key of each slice's value. Defaults to `value`. */
  valueKey?: string;
  /** The key of a color for each slice, when the data carries its own. */
  colorKey?: string;
  /** Colors for the slices in order, in place of the palette. */
  colors?: readonly string[];
  /** The size of the hole as a share of the radius, from 0 (a pie) to under 1 (a donut). Defaults to 0. */
  innerRadius?: number;
  /** The gap between slices, in degrees. Defaults to 1. */
  padAngle?: number;
  /** Rounds the corners of the slices, in pixels. Defaults to 0. */
  cornerRadius?: number;
  /** Where the first slice starts, in degrees clockwise from 12 o'clock. Defaults to 0. */
  startAngle?: number;
  /** Where slice labels go: `outside` with leader lines (the default), `inside` or `none`. */
  sliceLabels?: 'outside' | 'inside' | 'none';
  /** What a slice label says. Defaults to the name and the share. */
  sliceLabelContent?: 'name' | 'percent' | 'name-percent' | 'value';
  /** Text under the number in the middle of a donut. Defaults to "Total". `false` hides the middle. */
  centerLabel?: string | false;
  /** Replaces the number in the middle of a donut, which is the total. */
  centerValue?: string;
  /** Called with the row of a slice that is pressed or chosen with Enter. */
  onSliceClick?: (datum: ChartDatum, index: number) => void;
  /** Set by `DonutChart`. */
  kindLabel?: string;
}

interface Item {
  key: string;
  name: string;
  color: string;
  value: number;
  datum: ChartDatum;
  index: number;
}

const LABEL_GAP = 15;
const PULL = 6;

/**
 * A circle divided into slices by value. Slices can be switched off from the legend, the pointer
 * or the arrow keys read each one's value and share, and small slices are left unlabelled
 * rather than crowding the rest.
 */
export function PieChart(props: PieChartProps) {
  const {
    data,
    nameKey = 'name',
    valueKey = 'value',
    colorKey,
    colors,
    innerRadius = 0,
    padAngle = 1,
    cornerRadius = 0,
    startAngle = 0,
    sliceLabels = 'outside',
    sliceLabelContent = 'name-percent',
    centerLabel,
    centerValue,
    onSliceClick,
    kindLabel,
    height = 300,
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

  const items = useMemo<Item[]>(() => {
    const seen = new Map<string, number>();
    return data.map((datum, index) => {
      const name = String(datum[nameKey] ?? '');
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      const own = colorKey ? datum[colorKey] : undefined;
      return {
        // Two slices may share a name; the key still tells them apart.
        key: count === 0 ? name : `${name} (${count + 1})`,
        name,
        color: typeof own === 'string' ? own : (colors?.[index] ?? chartColor(index)),
        value: Math.max(0, toNumber(datum[valueKey]) ?? 0),
        datum,
        index,
      };
    });
  }, [data, nameKey, valueKey, colorKey, colors]);

  const visibility = useSeriesVisibility(items, {
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  });
  const visible = visibility.visible;
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.value, 0);

  const kind = kindLabel ?? (innerRadius > 0 ? 'Donut chart' : 'Pie chart');
  const summary = useMemo(
    () =>
      ariaLabel ??
      describePie({
        kind,
        title,
        description,
        slices: visible.map((item) => ({
          name: item.name,
          value: item.value,
          share: total > 0 ? item.value / total : 0,
        })),
        total,
        formatValue: numberFormat,
        formatShare: (share) => formatPercent(share, 1),
      }),
    [ariaLabel, kind, title, description, visible, total, numberFormat],
  );

  const showLegend = legend === undefined ? items.length > 1 : legend !== false;
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

  const tableNode = wantsDataTable(dataTable, items.length) ? (
    <DataTable
      caption={labels.dataTable(title)}
      headers={[labels.name, labels.value, labels.share]}
      rows={visibility.all.map((item) => [
        item.name,
        formatValue(item.value, numberFormat, locale),
        visibility.isHidden(item.key) || total <= 0 ? '–' : formatPercent(item.value, total),
      ])}
    />
  ) : null;

  return (
    <ChartFrame
      kind={innerRadius > 0 ? 'donut' : 'pie'}
      width={width}
      height={height}
      loading={loading}
      empty={items.length === 0 || grandTotal <= 0}
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
        <PiePlot
          size={size}
          visible={visible}
          total={total}
          innerRadius={innerRadius}
          padAngle={padAngle}
          cornerRadius={cornerRadius}
          startAngle={startAngle}
          sliceLabels={sliceLabels}
          sliceLabelContent={sliceLabelContent}
          centerLabel={centerLabel}
          centerValue={centerValue}
          highlightedKey={highlighted}
          numberFormat={numberFormat}
          locale={locale}
          tooltip={tooltip}
          ariaLabel={summary}
          labels={labelsProp}
          onSliceClick={onSliceClick}
        />
      )}
    </ChartFrame>
  );
}

interface PiePlotProps {
  size: ChartSize;
  visible: readonly Item[];
  total: number;
  innerRadius: number;
  padAngle: number;
  cornerRadius: number;
  startAngle: number;
  sliceLabels: 'outside' | 'inside' | 'none';
  sliceLabelContent: NonNullable<PieChartProps['sliceLabelContent']>;
  centerLabel?: string | false;
  centerValue?: string;
  highlightedKey: string | null;
  numberFormat: (value: number) => string;
  locale?: string;
  tooltip: boolean;
  ariaLabel: string;
  labels?: Partial<ChartLabels>;
  onSliceClick?: (datum: ChartDatum, index: number) => void;
}

function PiePlot({
  size,
  visible,
  total,
  innerRadius,
  padAngle,
  cornerRadius,
  startAngle,
  sliceLabels,
  sliceLabelContent,
  centerLabel,
  centerValue,
  highlightedKey,
  numberFormat,
  locale,
  tooltip,
  ariaLabel,
  labels: labelsProp,
  onSliceClick,
}: PiePlotProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const hintId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const outside = sliceLabels === 'outside';
  const labelRoom = outside ? Math.min(120, size.width * 0.25) : 0;
  const radius = Math.max(0, Math.min((size.width - 2 * labelRoom) / 2, (size.height - 24) / 2));
  const cx = size.width / 2;
  const cy = size.height / 2;
  const inner = radius * Math.min(Math.max(innerRadius, 0), 0.95);

  const slices = useMemo(
    () =>
      layoutPie(
        visible.map((item) => item.value),
        { startAngle: toRadians(startAngle), padAngle: toRadians(padAngle) },
      ),
    [visible, startAngle, padAngle],
  );

  const labelText = (item: Item) => {
    const percent = formatPercent(item.value, total);
    switch (sliceLabelContent) {
      case 'name':
        return item.name;
      case 'percent':
        return percent;
      case 'value':
        return numberFormat(item.value);
      default:
        return `${item.name} ${percent}`;
    }
  };

  // Outside labels sit beside their slice, spread apart so they do not overlap.
  const outsideLabels = useMemo(() => {
    if (!outside || radius <= 0) return [];
    const placed = slices
      .map((slice, position) => ({
        slice,
        position,
        line: leaderLine(slice.midAngle, radius, { cx, cy }),
      }))
      .filter(({ slice }) => slice.share >= 0.03);
    const result: ((typeof placed)[number] & { y: number })[] = [];
    for (const side of ['left', 'right'] as const) {
      const group = placed.filter((entry) => entry.line.side === side);
      const ys = spreadLabels(
        group.map((entry) => entry.line.end.y),
        LABEL_GAP,
        12,
        size.height - 12,
      );
      group.forEach((entry, i) => result.push({ ...entry, y: ys[i]! }));
    }
    return result;
  }, [outside, radius, slices, cx, cy, size.height]);

  const activeItem = active !== null ? visible[active] : undefined;
  const showCenter = inner > 0 && centerLabel !== false;
  const centerFont = Math.max(14, Math.min(32, inner * 0.5));

  const anchorOf = (index: number) => {
    const slice = slices[index];
    return slice
      ? polarToCartesian(cx, cy, (inner + radius) / 2, slice.midAngle)
      : { x: cx, y: cy };
  };

  const show = (index: number | null, from: 'pointer' | 'keyboard') => {
    setActive(index);
    setByKeyboard(from === 'keyboard' && index !== null);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const last = visible.length - 1;
    if (last < 0) return;
    let next: number | null = active;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = active === null ? 0 : Math.min(last, active + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = active === null ? last : Math.max(0, active - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape' && active !== null) {
      event.preventDefault();
      show(null, 'keyboard');
      return;
    } else if ((event.key === 'Enter' || event.key === ' ') && active !== null && onSliceClick) {
      event.preventDefault();
      onSliceClick(visible[active]!.datum, visible[active]!.index);
      return;
    } else return;
    event.preventDefault();
    show(next, 'keyboard');
    if (next !== null) setPointer(anchorOf(next));
  };

  const handlePointer = (event: PointerEvent<SVGPathElement>, index: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    setPointer({ x: event.clientX - box.left, y: event.clientY - box.top });
    show(index, 'pointer');
  };

  const announcement =
    byKeyboard && activeItem
      ? `${activeItem.name}: ${formatValue(activeItem.value, numberFormat, locale)} (${formatPercent(activeItem.value, total)})`
      : '';
  const interactive = visible.length > 0;

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
        {radius > 0 ? (
          <g>
            {slices.map((slice, position) => {
              const item = visible[position]!;
              const d = arcPath({
                innerRadius: inner,
                outerRadius: radius,
                startAngle: slice.startAngle,
                endAngle: slice.endAngle,
                padAngle: toRadians(padAngle),
                cornerRadius,
              });
              if (!d || slice.value <= 0) return null;
              const isActive = active === position;
              const dimmed =
                (active !== null && !isActive) ||
                (highlightedKey !== null && highlightedKey !== item.key);
              const pull = isActive ? polarToCartesian(0, 0, PULL, slice.midAngle) : { x: 0, y: 0 };
              return (
                <path
                  key={item.key}
                  className={`axon-chart__slice${dimmed ? ' axon-chart__dimmed' : ''}`}
                  d={d}
                  transform={`translate(${cx + pull.x}, ${cy + pull.y})`}
                  style={{ fill: item.color }}
                  data-active={isActive || undefined}
                  onPointerMove={(event) => handlePointer(event, position)}
                  onPointerDown={(event) => handlePointer(event, position)}
                  onPointerLeave={() => {
                    if (!byKeyboard) show(null, 'pointer');
                  }}
                  onClick={() => onSliceClick?.(item.datum, item.index)}
                />
              );
            })}

            {sliceLabels === 'inside'
              ? slices.map((slice, position) => {
                  if (slice.share < 0.06) return null;
                  const point = polarToCartesian(cx, cy, (inner + radius) / 2, slice.midAngle);
                  return (
                    <text
                      key={visible[position]!.key}
                      className="axon-chart__slice-label axon-chart__slice-label--inside"
                      x={point.x}
                      y={point.y}
                      textAnchor="middle"
                      dy="0.32em"
                      pointerEvents="none"
                    >
                      {labelText(visible[position]!)}
                    </text>
                  );
                })
              : null}

            {outsideLabels.map(({ slice, position, line, y }) => {
              const item = visible[position]!;
              const sign = line.side === 'right' ? 1 : -1;
              return (
                <g key={item.key} pointerEvents="none">
                  <polyline
                    className="axon-chart__leader"
                    points={`${line.start.x},${line.start.y} ${line.elbow.x},${line.elbow.y} ${line.end.x},${y}`}
                  />
                  <text
                    className="axon-chart__tick-label"
                    x={line.end.x + sign * 4}
                    y={y}
                    dy="0.32em"
                    textAnchor={line.side === 'right' ? 'start' : 'end'}
                  >
                    {labelText(item)}
                  </text>
                  <title>{`${item.name}: ${formatPercent(slice.value, total)}`}</title>
                </g>
              );
            })}

            {showCenter ? (
              <g pointerEvents="none">
                <text
                  className="axon-chart__center-value"
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dy="-0.05em"
                  style={{ fontSize: centerFont }}
                >
                  {activeItem
                    ? formatValue(activeItem.value, numberFormat, locale)
                    : (centerValue ?? numberFormat(total))}
                </text>
                <text
                  className="axon-chart__center-label"
                  x={cx}
                  y={cy + centerFont * 0.9}
                  textAnchor="middle"
                >
                  {activeItem ? activeItem.name : (centerLabel ?? 'Total')}
                </text>
              </g>
            ) : null}
          </g>
        ) : null}
      </svg>
      {tooltip && activeItem && pointer ? (
        <Tooltip
          x={pointer.x}
          y={pointer.y}
          containerWidth={size.width}
          containerHeight={size.height}
        >
          <TooltipContent
            title={activeItem.name}
            rows={[
              {
                key: 'value',
                color: activeItem.color,
                name: labels.value,
                value: formatValue(activeItem.value, numberFormat, locale),
              },
              { key: 'share', name: labels.share, value: formatPercent(activeItem.value, total) },
            ]}
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

/** Slices as shares of the whole, as a donut. See `PieChart`. */
export function DonutChart(props: PieChartProps) {
  return <PieChart innerRadius={0.62} padAngle={1.5} {...props} />;
}
