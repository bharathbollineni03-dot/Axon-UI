import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useMediaQuery } from '@axon/core';
import { DataTable, wantsDataTable } from '../../internal/DataTable';
import { createNumberFormatter, formatDateLong, formatValue } from '../../internal/format';
import {
  buildMatrix,
  calendarLayout,
  levelFor,
  levelOpacity,
  matrixExtremes,
} from '../../internal/heatmapLayout';
import { estimateTextWidth } from '../../internal/layout';
import { chartColor } from '../../internal/palette';
import { computeDomain, thinCategories } from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';
import { defaultChartLabels, type AxisConfig, type ChartProps } from '../../types';
import { ChartFrame } from '../ChartFrame/ChartFrame';
import type { ChartSize } from '../ResponsiveContainer/ResponsiveContainer';
import { Tooltip, TooltipContent } from '../Tooltip/Tooltip';

export interface HeatmapProps extends Omit<ChartProps, 'margin'> {
  /** The key of each cell's number. Defaults to `value`. */
  valueKey?: string;
  /** The key of the category across the top. */
  xKey?: string;
  /** The key of the category down the side. */
  yKey?: string;
  /** Fixes the order of the x categories. By default they run in the order they first appear. */
  xOrder?: readonly string[];
  /** Fixes the order of the y categories. */
  yOrder?: readonly string[];
  /**
   * Lays the days out as a calendar, a column per week and a row per weekday, like a contribution
   * graph. Each row of `data` needs a date under `dateKey`.
   */
  calendar?: boolean;
  /** The key of each row's date, for a calendar. Defaults to `date`. */
  dateKey?: string;
  /** The first day of the week in a calendar: 0 is Sunday (default), 1 is Monday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Any CSS color; bigger values are more solid. Defaults to the first palette color. */
  color?: string;
  /** How many shades there are between the lowest and highest. Defaults to 5. */
  steps?: number;
  /** Fixes the lowest and highest value of the scale. By default it fits the data, from 0. */
  domain?: readonly [number, number];
  /** Writes each cell's number in it, when the cells are big enough. */
  showValues?: boolean;
  /** Rounds the corners of cells, in pixels. Defaults to 3. */
  cellRadius?: number;
  /** The space between cells, in pixels. Defaults to 2 (3 in a calendar). */
  cellGap?: number;
  /** The width and height of a cell in a calendar, in pixels. Defaults to 13. */
  cellSize?: number;
  /** Settings for the labels across the top: show or hide them. */
  xAxis?: boolean | AxisConfig;
  /** Settings for the labels down the side. */
  yAxis?: boolean | AxisConfig;
  /** Shows the scale from "Less" to "More" under the chart. Defaults to true. */
  scale?: boolean;
  /** Called with the row of a cell that is pressed or chosen with Enter (`null` for a cell with no data). */
  onCellClick?: (
    datum: ChartDatum | null,
    position: { x: string; y: string } | { date: Date },
  ) => void;
}

interface Cell {
  row: number;
  col: number;
  value: number | null;
  datum: ChartDatum | null;
  /** What the cell is called out loud and in the tooltip's heading. */
  title: string;
  position: { x: string; y: string } | { date: Date };
}

interface Model {
  rows: number;
  cols: number;
  cells: Cell[];
  at: (row: number, col: number) => Cell | null;
  xLabels: { col: number; text: string }[];
  yLabels: { row: number; text: string }[];
  summary: (formatNumber: (value: number) => string) => string;
  table: (format: (value: number | null) => string) => { headers: string[]; rows: string[][] };
}

const resolveAxis = (axis: boolean | AxisConfig | undefined): AxisConfig =>
  axis === undefined || axis === true ? {} : axis === false ? { show: false } : axis;

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * A grid of cells shaded by value: activity by day and hour, scores by team and month. In
 * `calendar` mode the cells are days in weeks, like a contribution graph. Arrow keys move across
 * the cells, the pointer reads one, and a table of the values is there for screen readers.
 */
export function Heatmap(props: HeatmapProps) {
  const {
    data,
    valueKey = 'value',
    xKey = 'x',
    yKey = 'y',
    xOrder,
    yOrder,
    calendar = false,
    dateKey = 'date',
    weekStartsOn = 0,
    color,
    steps = 5,
    domain,
    showValues = false,
    cellRadius = 3,
    cellGap,
    cellSize = 13,
    scale = true,
    onCellClick,
    height = 260,
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
  } = props;
  const labels = { ...defaultChartLabels, ...labelsProp };
  const xAxis = resolveAxis(props.xAxis);
  const yAxis = resolveAxis(props.yAxis);
  const fill = color ?? chartColor(0);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const numberFormat = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);
  const gap = cellGap ?? (calendar ? 3 : 2);

  const model = useMemo<Model>(() => {
    if (calendar) {
      const layout = calendarLayout(data, { dateKey, valueKey, weekStartsOn });
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
      const month = new Intl.DateTimeFormat(locale, { month: 'short' });
      const cells: Cell[] = layout.cells.map((cell) => ({
        row: cell.row,
        col: cell.col,
        value: cell.value,
        datum: cell.datum,
        title: formatDateLong(cell.date, locale),
        position: { date: cell.date },
      }));
      const byPosition = new Map(cells.map((cell) => [`${cell.row}:${cell.col}`, cell]));
      return {
        rows: 7,
        cols: layout.weeks,
        cells,
        at: (row, col) => byPosition.get(`${row}:${col}`) ?? null,
        xLabels: layout.months.map((item) => ({ col: item.col, text: month.format(item.date) })),
        // A label on every other row keeps the weekday names from crowding each other.
        yLabels: [1, 3, 5].map((row) => ({
          row,
          text: weekday.format(new Date(2024, 0, 7 + weekStartsOn + row)),
        })),
        summary: (format) => {
          const withValue = cells.filter((cell) => cell.value !== null);
          if (cells.length === 0) return 'Calendar heatmap with no data.';
          const best = withValue.reduce<Cell | null>(
            (top, cell) => (!top || cell.value! > top.value! ? cell : top),
            null,
          );
          return `Calendar heatmap from ${cells[0]!.title} to ${cells[cells.length - 1]!.title}. ${withValue.length} of ${cells.length} days have a value.${
            best ? ` Highest ${format(best.value!)} on ${best.title}.` : ''
          }`;
        },
        table: (format) => ({
          headers: [dateKey, valueKey],
          rows: cells.filter((cell) => cell.datum).map((cell) => [cell.title, format(cell.value)]),
        }),
      };
    }

    const matrix = buildMatrix(data, { xKey, yKey, valueKey, xOrder, yOrder });
    const cells: Cell[] = matrix.cells.flat().map((cell) => ({
      row: cell.row,
      col: cell.col,
      value: cell.value,
      datum: cell.datum,
      title: `${cell.y}, ${cell.x}`,
      position: { x: cell.x, y: cell.y },
    }));
    return {
      rows: matrix.ys.length,
      cols: matrix.xs.length,
      cells,
      at: (row, col) => cells[row * matrix.xs.length + col] ?? null,
      xLabels: matrix.xs.map((text, col) => ({ col, text })),
      yLabels: matrix.ys.map((text, row) => ({ row, text })),
      summary: (format) => {
        const extremes = matrixExtremes(matrix);
        if (matrix.ys.length === 0 || matrix.xs.length === 0) return 'Heatmap with no data.';
        return `Heatmap of ${valueKey} by ${yKey} and ${xKey}: ${matrix.ys.length} rows, ${matrix.xs.length} columns.${
          extremes
            ? ` Highest ${format(extremes.high.value!)} at ${extremes.high.y}, ${extremes.high.x}. Lowest ${format(extremes.low.value!)} at ${extremes.low.y}, ${extremes.low.x}.`
            : ''
        }`;
      },
      table: (format) => ({
        headers: [yKey, ...matrix.xs],
        rows: matrix.cells.map((row) => [
          row[0]?.y ?? '',
          ...row.map((cell) => format(cell.value)),
        ]),
      }),
    };
  }, [data, calendar, dateKey, valueKey, weekStartsOn, xKey, yKey, xOrder, yOrder, locale]);

  const values = model.cells.map((cell) => cell.value);
  const scaleDomain = useMemo<[number, number]>(
    () => (domain ? [domain[0], domain[1]] : computeDomain(values, { includeZero: true })),
    // `values` changes whenever `model` does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [domain, model],
  );

  const summary = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    const parts: string[] = [];
    if (title) parts.push(sentence(title));
    parts.push(model.summary(numberFormat));
    if (description) parts.push(sentence(description));
    return parts.join(' ');
  }, [ariaLabel, title, description, model, numberFormat]);

  // A calendar is as wide as its weeks need; a grid of categories fills its parent.
  const calendarSize = useMemo(() => {
    if (!calendar) return null;
    const step = cellSize + gap;
    const left = yAxis.show === false ? 4 : 34;
    const top = xAxis.show === false ? 4 : 20;
    return { step, left, top, width: left + model.cols * step + 4, height: top + 7 * step + 4 };
  }, [calendar, cellSize, gap, yAxis.show, xAxis.show, model.cols]);

  const tableNode = wantsDataTable(dataTable, model.cells.length)
    ? (() => {
        const { headers, rows } = model.table((value) => formatValue(value, numberFormat, locale));
        return <DataTable caption={labels.dataTable(title)} headers={headers} rows={rows} />;
      })()
    : null;

  const scaleNode =
    scale && model.cells.some((cell) => cell.value !== null) ? (
      <div className="axon-heatmap-scale" aria-hidden="true">
        <span>{labels.scaleLow}</span>
        <span className="axon-heatmap-scale__value">{numberFormat(scaleDomain[0])}</span>
        {Array.from({ length: steps }, (_, level) => (
          <span
            key={level}
            className="axon-heatmap-scale__swatch"
            style={{ background: fill, opacity: levelOpacity(level, steps) }}
          />
        ))}
        <span className="axon-heatmap-scale__value">{numberFormat(scaleDomain[1])}</span>
        <span>{labels.scaleHigh}</span>
      </div>
    ) : null;

  return (
    <ChartFrame
      kind={calendar ? 'heatmap calendar' : 'heatmap'}
      width={calendarSize ? calendarSize.width : width}
      height={calendarSize ? calendarSize.height : height}
      loading={loading}
      empty={model.cells.length === 0}
      emptyState={emptyState}
      title={title}
      description={description}
      legend={scaleNode}
      dataTable={tableNode}
      animate={animate && !reducedMotion}
      labels={labelsProp}
      className={className}
      style={style}
    >
      {(size) => (
        <HeatmapPlot
          size={size}
          model={model}
          calendarSize={calendarSize}
          domain={scaleDomain}
          steps={steps}
          fill={fill}
          gap={gap}
          cellRadius={cellRadius}
          showValues={showValues}
          showX={xAxis.show !== false}
          showY={yAxis.show !== false}
          numberFormat={numberFormat}
          locale={locale}
          valueName={valueKey}
          tooltip={tooltip}
          ariaLabel={summary}
          labelsProp={labelsProp}
          onCellClick={onCellClick}
        />
      )}
    </ChartFrame>
  );
}

interface HeatmapPlotProps {
  size: ChartSize;
  model: Model;
  calendarSize: { step: number; left: number; top: number } | null;
  domain: readonly [number, number];
  steps: number;
  fill: string;
  gap: number;
  cellRadius: number;
  showValues: boolean;
  showX: boolean;
  showY: boolean;
  numberFormat: (value: number) => string;
  locale?: string;
  valueName: string;
  tooltip: boolean;
  ariaLabel: string;
  labelsProp?: HeatmapProps['labels'];
  onCellClick?: HeatmapProps['onCellClick'];
}

function HeatmapPlot({
  size,
  model,
  calendarSize,
  domain,
  steps,
  fill,
  gap,
  cellRadius,
  showValues,
  showX,
  showY,
  numberFormat,
  locale,
  valueName,
  tooltip,
  ariaLabel,
  labelsProp,
  onCellClick,
}: HeatmapPlotProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const hintId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<Cell | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  // Where the grid is and how big a step is, for either kind of heatmap.
  const geometry = useMemo(() => {
    if (calendarSize) {
      return {
        left: calendarSize.left,
        top: calendarSize.top,
        stepX: calendarSize.step,
        stepY: calendarSize.step,
      };
    }
    const widest = model.yLabels.reduce(
      (best, item) => Math.max(best, estimateTextWidth(item.text)),
      0,
    );
    const left = showY ? Math.ceil(widest) + 12 : 4;
    const top = 4;
    const bottom = showX ? 24 : 4;
    return {
      left,
      top,
      stepX: Math.max(1, (size.width - left - 4) / Math.max(1, model.cols)),
      stepY: Math.max(1, (size.height - top - bottom) / Math.max(1, model.rows)),
    };
  }, [calendarSize, model, showX, showY, size]);

  const { left, top, stepX, stepY } = geometry;
  const cellW = Math.max(1, stepX - gap);
  const cellH = Math.max(1, stepY - gap);
  const gridWidth = stepX * model.cols;
  const gridHeight = stepY * model.rows;

  const spoken = (cell: Cell) =>
    `${cell.title}: ${cell.value === null ? 'no data' : formatValue(cell.value, numberFormat, locale)}`;

  const xLabels = useMemo(() => {
    if (calendarSize) return model.xLabels;
    const widest = model.xLabels.reduce(
      (best, item) => Math.max(best, estimateTextWidth(item.text)),
      0,
    );
    return thinCategories(model.xLabels, Math.max(1, Math.floor(gridWidth / (widest + 8))));
  }, [calendarSize, model, gridWidth]);
  const yLabels = useMemo(
    () =>
      calendarSize
        ? model.yLabels
        : thinCategories(model.yLabels, Math.max(1, Math.floor(gridHeight / 14))),
    [calendarSize, model, gridHeight],
  );

  const show = (cell: Cell | null, from: 'pointer' | 'keyboard') => {
    setActive(cell);
    setByKeyboard(from === 'keyboard' && cell !== null);
  };

  const handlePointer = (event: PointerEvent<SVGRectElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const col = Math.floor((x - left) / stepX);
    const row = Math.floor((y - top) / stepY);
    const cell =
      col >= 0 && col < model.cols && row >= 0 && row < model.rows ? model.at(row, col) : null;
    setPointer({ x, y });
    show(cell, 'pointer');
  };

  const move = (from: Cell | null, rowStep: number, colStep: number): Cell | null => {
    if (!from) return model.cells[0] ?? null;
    // In a calendar, up and down walk the days in order, wrapping to the next or previous week.
    if (calendarSize && rowStep !== 0) {
      const index = model.cells.indexOf(from) + rowStep;
      return model.cells[Math.min(model.cells.length - 1, Math.max(0, index))] ?? from;
    }
    let row = from.row + rowStep;
    let col = from.col + colStep;
    while (row >= 0 && row < model.rows && col >= 0 && col < model.cols) {
      const found = model.at(row, col);
      if (found) return found;
      row += rowStep;
      col += colStep;
    }
    return from;
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    let next: Cell | null = active;
    switch (event.key) {
      case 'ArrowRight':
        next = move(active, 0, 1);
        break;
      case 'ArrowLeft':
        next = move(active, 0, -1);
        break;
      case 'ArrowDown':
        next = move(active, 1, 0);
        break;
      case 'ArrowUp':
        next = move(active, -1, 0);
        break;
      case 'Home':
        next = active
          ? calendarSize
            ? model.cells[0]!
            : (model.at(active.row, 0) ?? active)
          : (model.cells[0] ?? null);
        break;
      case 'End':
        next = active
          ? calendarSize
            ? model.cells[model.cells.length - 1]!
            : (model.at(active.row, model.cols - 1) ?? active)
          : (model.cells[model.cells.length - 1] ?? null);
        break;
      case 'Escape':
        if (active) {
          event.preventDefault();
          show(null, 'keyboard');
        }
        return;
      case 'Enter':
      case ' ':
        if (active && onCellClick) {
          event.preventDefault();
          onCellClick(active.datum, active.position);
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next) {
      show(next, 'keyboard');
      setPointer({ x: left + next.col * stepX + cellW / 2, y: top + next.row * stepY + cellH / 2 });
    }
  };

  const announcement = byKeyboard && active ? spoken(active) : '';
  const interactive = model.cells.length > 0;
  const valueText = (cell: Cell) =>
    cell.value === null ? 'No data' : formatValue(cell.value, numberFormat, locale);

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
        <g>
          {showX
            ? xLabels.map((item) => (
                <text
                  key={`x-${item.col}`}
                  className="axon-chart__tick-label"
                  x={left + item.col * stepX + (calendarSize ? 0 : cellW / 2)}
                  y={calendarSize ? top - 6 : top + gridHeight + 14}
                  textAnchor={calendarSize ? 'start' : 'middle'}
                >
                  {item.text}
                </text>
              ))
            : null}
          {showY
            ? yLabels.map((item) => (
                <text
                  key={`y-${item.row}`}
                  className="axon-chart__tick-label"
                  x={left - 6}
                  y={top + item.row * stepY + cellH / 2}
                  dy="0.32em"
                  textAnchor="end"
                >
                  {item.text}
                </text>
              ))
            : null}
          {model.cells.map((cell) => {
            const level = levelFor(cell.value, domain, steps);
            const x = left + cell.col * stepX;
            const y = top + cell.row * stepY;
            const isActive = active === cell;
            return (
              <g key={`${cell.row}:${cell.col}`}>
                <rect
                  className={`axon-chart__cell${level < 0 ? ' axon-chart__cell--empty' : ''}`}
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx={Math.min(cellRadius, cellW / 2, cellH / 2)}
                  style={level < 0 ? undefined : { fill, fillOpacity: levelOpacity(level, steps) }}
                  data-level={level}
                  data-active={isActive || undefined}
                />
                {showValues &&
                !calendarSize &&
                cell.value !== null &&
                cellW >= 26 &&
                cellH >= 16 ? (
                  <text
                    className={`axon-chart__cell-value${level >= Math.ceil(steps / 2) ? ' axon-chart__cell-value--on-dark' : ''}`}
                    x={x + cellW / 2}
                    y={y + cellH / 2}
                    dy="0.32em"
                    textAnchor="middle"
                  >
                    {numberFormat(cell.value)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {active ? (
            <rect
              className="axon-chart__cell-focus"
              x={left + active.col * stepX - 1}
              y={top + active.row * stepY - 1}
              width={cellW + 2}
              height={cellH + 2}
              rx={Math.min(cellRadius + 1, (cellW + 2) / 2)}
            />
          ) : null}
          {interactive ? (
            <rect
              className="axon-chart__hit"
              x={left}
              y={top}
              width={gridWidth}
              height={gridHeight}
              fill="transparent"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => {
                if (!byKeyboard) show(null, 'pointer');
              }}
              onClick={() => {
                if (active) onCellClick?.(active.datum, active.position);
              }}
            />
          ) : null}
        </g>
      </svg>
      {tooltip && active && pointer ? (
        <Tooltip
          x={pointer.x}
          y={pointer.y}
          containerWidth={size.width}
          containerHeight={size.height}
        >
          <TooltipContent
            title={active.title}
            rows={[{ key: 'value', color: fill, name: valueName, value: valueText(active) }]}
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
