import type { CSSProperties, ReactNode } from 'react';
import type { ChartDatum } from './internal/stack';
import type { ValueFormat } from './internal/format';
import type { Margin } from './internal/layout';
import type { SeriesInput } from './internal/palette';

export type { ChartDatum } from './internal/stack';
export type { ValueFormat } from './internal/format';
export type { Margin } from './internal/layout';
export type { SeriesInput } from './internal/palette';

/** The words charts use, for translation. */
export interface ChartLabels {
  /** Shown when there is no data. */
  empty: string;
  /** Read out while a chart is loading. */
  loading: string;
  /** The name of the legend. */
  legend: string;
  /** Said when the chart takes focus, to explain the arrow keys. */
  keyboardHint: string;
  /** The caption of the hidden data table: `title` is the chart's title when it has one. */
  dataTable: (title: string | undefined) => string;
  /** Column headings of the data table of a pie, donut or other chart of named values. */
  name: string;
  value: string;
  share: string;
  /** The ends of a heatmap's color scale. */
  scaleLow: string;
  scaleHigh: string;
}

export const defaultChartLabels: ChartLabels = {
  empty: 'No data to display',
  loading: 'Loading chart',
  legend: 'Legend',
  keyboardHint: 'Use the arrow keys to move between data points. Press Escape to leave them.',
  dataTable: (title) => (title ? `Data for ${title}` : 'Chart data'),
  name: 'Name',
  value: 'Value',
  share: 'Share',
  scaleLow: 'Less',
  scaleHigh: 'More',
};

export interface AxisConfig {
  /** Shows the axis. Defaults to true. */
  show?: boolean;
  /** A title for the axis. */
  label?: string;
  /** Formats the ticks: a d3-format specifier such as `~s` or `$,.0f` for numbers, or your own function. */
  tickFormat?: ValueFormat | ((value: unknown) => string);
  /** About how many ticks to show. Fewer are used when labels would overlap. */
  tickCount?: number;
  /** Draws grid lines from the ticks. Defaults to true for the y axis and false for the x axis. */
  grid?: boolean;
}

/** What every chart that has a legend, tooltip and a series list accepts. */
export interface ChartProps {
  /** One object per row. Every key a series or axis reads comes from here. */
  data: readonly ChartDatum[];
  /** Height in pixels. Defaults to 300. */
  height?: number;
  /** A fixed width in pixels. Without it the chart fills its parent. */
  width?: number;
  /** A title shown above the chart, and used in its accessible name. */
  title?: string;
  /** A line shown under the title, and read as part of the chart's description. */
  description?: string;
  /** Replaces the generated summary that names the chart for screen readers. */
  ariaLabel?: string;
  /** Shows a placeholder in place of the chart. */
  loading?: boolean;
  /** Shown when `data` is empty. Defaults to the "No data to display" text. */
  emptyState?: ReactNode;
  /** Draws marks in with a short animation. Never animates when the user prefers reduced motion. Defaults to true. */
  animate?: boolean;
  /**
   * Adds a visually hidden table of the data, for people who cannot see the chart. `auto` (the
   * default) adds it for 50 rows or fewer.
   */
  dataTable?: boolean | 'auto';
  /** Locale for numbers and dates. Defaults to the browser's. */
  locale?: string;
  /** Formats values in the tooltip and data table: a d3-format specifier or a function. */
  valueFormat?: ValueFormat;
  /** Shows the shared tooltip. Defaults to true. */
  tooltip?: boolean;
  /** Overrides any side of the space around the plot. */
  margin?: Partial<Margin>;
  /** The words used, for translation. */
  labels?: Partial<ChartLabels>;
  className?: string;
  style?: CSSProperties;
}

/** Charts with a list of series that a legend can switch on and off. */
export interface SeriesChartProps extends ChartProps {
  series: readonly SeriesInput[];
  /** Where the legend goes, or `false` to hide it. Defaults to `bottom` when there is more than one series. */
  legend?: boolean | 'top' | 'bottom';
  /** The keys of the hidden series, when you control it. */
  hiddenSeries?: readonly string[];
  /** The keys of the series hidden at the start. */
  defaultHiddenSeries?: readonly string[];
  /** Called with the new list when a legend item is pressed. */
  onHiddenSeriesChange?: (hidden: string[]) => void;
}

/** What a chart with an x axis (line, area, bar, combo) accepts. */
export interface CartesianChartProps extends SeriesChartProps {
  /** The key of the value on the x axis: a category, number or date. */
  xKey: string;
  xAxis?: boolean | AxisConfig;
  yAxis?: boolean | AxisConfig;
  /** Called with the row of a data point that is pressed or chosen with Enter. */
  onPointClick?: (datum: ChartDatum, index: number) => void;
}
