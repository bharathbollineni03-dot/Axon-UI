import { useMemo, useState } from 'react';
import { useMediaQuery } from '@axon/core';
import { DataTable, wantsDataTable } from '../../internal/DataTable';
import {
  createNumberFormatter,
  createXFormatter,
  formatValue,
  toNumber,
} from '../../internal/format';
import type { ResolvedSeries } from '../../internal/palette';
import { inferXKind, type XScaleKind } from '../../internal/scales';
import type { ChartDatum } from '../../internal/stack';
import { describeCartesian } from '../../internal/summary';
import { useSeriesVisibility } from '../../internal/useSeriesVisibility';
import { defaultChartLabels, type AxisConfig, type CartesianChartProps } from '../../types';
import { CartesianPlot, type CartesianSpec } from '../CartesianPlot/CartesianPlot';
import { ChartFrame } from '../ChartFrame/ChartFrame';
import { Legend } from '../Legend/Legend';

/** What a chart type is given to build its `CartesianSpec` from. */
export interface SpecInput {
  /** The series that are showing. */
  visible: readonly ResolvedSeries[];
  /** Every series, showing or not. */
  all: readonly ResolvedSeries[];
  /** The rows, sorted along the x axis when x is a number or a date. */
  data: readonly ChartDatum[];
  xKind: XScaleKind;
}

export interface CartesianShellProps extends CartesianChartProps {
  /** For the class name: `line`, `bar`. */
  kind: string;
  /** For the accessible summary: "Line chart". */
  kindLabel: string;
  /** `infer` picks `time`, `linear` or `point` from the x values; `band` gives each x a slot, as bars need. */
  xKindOption: 'infer' | 'band';
  /** Builds what the plot draws. It must be stable (`useCallback`), or the plot is redrawn every render. */
  buildSpec: (input: SpecInput) => CartesianSpec;
  /** A right-hand value axis, for charts with two. */
  y2Axis?: boolean | AxisConfig;
}

const resolveAxis = (axis: boolean | AxisConfig | undefined): AxisConfig =>
  axis === undefined || axis === true ? {} : axis === false ? { show: false } : axis;

/**
 * Everything the line, area, bar and combo charts share: which series are showing, the legend,
 * sorting by x, the accessible summary and data table, and the frame and plot. A chart supplies
 * only `buildSpec`.
 */
export function CartesianShell({
  kind,
  kindLabel,
  xKindOption,
  buildSpec,
  data,
  xKey,
  series,
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
  margin,
  labels: labelsProp,
  className,
  style,
  legend,
  hiddenSeries,
  defaultHiddenSeries,
  onHiddenSeriesChange,
  xAxis: xAxisProp,
  yAxis: yAxisProp,
  y2Axis: y2AxisProp,
  onPointClick,
}: CartesianShellProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const visibility = useSeriesVisibility(series, {
    hiddenSeries,
    defaultHiddenSeries,
    onHiddenSeriesChange,
  });
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const xAxis = resolveAxis(xAxisProp);
  const yAxis = resolveAxis(yAxisProp);
  const y2Axis = y2AxisProp === undefined ? undefined : resolveAxis(y2AxisProp);

  // Lines and areas need their rows in x order; bars keep the order given.
  const { rows, xKind } = useMemo(() => {
    const kindOfX: XScaleKind =
      xKindOption === 'band' ? 'band' : inferXKind(data.map((datum) => datum[xKey]));
    if (kindOfX !== 'linear' && kindOfX !== 'time') return { rows: data, xKind: kindOfX };
    const sorted = [...data].sort((a, b) => Number(toTime(a[xKey])) - Number(toTime(b[xKey])));
    return { rows: sorted, xKind: kindOfX };
  }, [data, xKey, xKindOption]);

  const spec = useMemo(
    () => buildSpec({ visible: visibility.visible, all: visibility.all, data: rows, xKind }),
    [buildSpec, visibility.visible, visibility.all, rows, xKind],
  );

  const formatX = useMemo(
    () =>
      createXFormatter(
        xAxis.tickFormat as string | ((value: unknown) => string) | undefined,
        locale,
      ),
    [xAxis.tickFormat, locale],
  );
  const numberFormat = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);

  const summary = useMemo(
    () =>
      ariaLabel ??
      describeCartesian({
        kind: kindLabel,
        title,
        description,
        data: rows,
        xKey,
        series: visibility.visible,
        formatX,
        formatValue: numberFormat,
      }),
    [
      ariaLabel,
      kindLabel,
      title,
      description,
      rows,
      xKey,
      visibility.visible,
      formatX,
      numberFormat,
    ],
  );

  const showLegend = legend === undefined ? series.length > 1 : legend !== false;
  const legendPosition = legend === 'top' ? 'top' : 'bottom';
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

  const tableNode = wantsDataTable(dataTable, rows.length) ? (
    <DataTable
      caption={labels.dataTable(title)}
      headers={[xAxis.label ?? xKey, ...visibility.all.map((item) => item.name)]}
      rows={rows.map((datum) => [
        formatX(datum[xKey]),
        ...visibility.all.map((item) =>
          formatValue(toNumber(datum[item.key]), numberFormat, locale),
        ),
      ])}
    />
  ) : null;

  return (
    <ChartFrame
      kind={kind}
      width={width}
      height={height}
      loading={loading}
      empty={rows.length === 0}
      emptyState={emptyState}
      title={title}
      description={description}
      legend={legendNode}
      legendPosition={legendPosition}
      dataTable={tableNode}
      animate={animate && !reducedMotion}
      labels={labelsProp}
      className={className}
      style={style}
    >
      {(size) => (
        <CartesianPlot
          size={size}
          data={rows}
          xKey={xKey}
          allSeries={visibility.all}
          visibleSeries={visibility.visible}
          spec={spec}
          xAxis={xAxis}
          yAxis={yAxis}
          y2Axis={y2Axis}
          margin={margin}
          locale={locale}
          valueFormat={valueFormat}
          tooltip={tooltip}
          ariaLabel={summary}
          labels={labelsProp}
          animate={animate && !reducedMotion}
          highlighted={highlighted}
          onPointClick={onPointClick}
        />
      )}
    </ChartFrame>
  );
}

function toTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : NaN;
}
