// Charts
export { LineChart, type LineChartProps } from './components/LineChart/LineChart';
export { AreaChart, type AreaChartProps } from './components/AreaChart/AreaChart';
export { BarChart, type BarChartProps } from './components/BarChart/BarChart';
export { DonutChart, PieChart, type PieChartProps } from './components/PieChart/PieChart';
export { ScatterChart, type ScatterChartProps } from './components/ScatterChart/ScatterChart';
export { RadarChart, type RadarChartProps } from './components/RadarChart/RadarChart';
export { Heatmap, type HeatmapProps } from './components/Heatmap/Heatmap';
export { Gauge, bandFor, type GaugeProps, type GaugeThreshold } from './components/Gauge/Gauge';
export { Sparkline, type SparklineProps } from './components/Sparkline/Sparkline';
export {
  StatCard,
  defaultStatCardLabels,
  type StatCardLabels,
  type StatCardProps,
} from './components/StatCard/StatCard';
export {
  ComboChart,
  type ComboChartProps,
  type ComboSeries,
} from './components/ComboChart/ComboChart';

// Building blocks
export {
  ResponsiveContainer,
  type ChartSize,
  type ResponsiveContainerProps,
} from './components/ResponsiveContainer/ResponsiveContainer';
export {
  Axis,
  XAxis,
  YAxis,
  type AxisOrientation,
  type AxisProps,
  type XAxisProps,
  type YAxisProps,
} from './components/Axis/Axis';
export {
  fitTickCount,
  xScaleTicks,
  yScaleTicks,
  type AxisTick,
  type XTickOptions,
  type YTickOptions,
} from './components/Axis/ticks';
export { Legend, type LegendItem, type LegendProps } from './components/Legend/Legend';
export {
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  type TooltipProps,
  type TooltipRow,
} from './components/Tooltip/Tooltip';
export {
  CrosshairCursor,
  type CrosshairCursorProps,
} from './components/CrosshairCursor/CrosshairCursor';

// Math, for building your own
export {
  computeDomain,
  createXScale,
  createYScale,
  inferXKind,
  nearestIndex,
  type DomainOptions,
  type XScale,
  type XScaleKind,
  type YScale,
} from './internal/scales';
export { stackSeries, type StackOffset, type StackedPoint } from './internal/stack';
export { chartColor, resolveSeries, type ResolvedSeries } from './internal/palette';
export { createNumberFormatter } from './internal/format';
export type { CurveType } from './internal/curves';

// Types
export {
  defaultChartLabels,
  type AxisConfig,
  type CartesianChartProps,
  type ChartDatum,
  type ChartLabels,
  type ChartProps,
  type Margin,
  type SeriesChartProps,
  type SeriesInput,
  type ValueFormat,
} from './types';
