# @axonui/charts

Charts for React, drawn as plain SVG. The math (scales, shapes, number formats) comes from small [d3](https://d3js.org) modules; everything on the page is React, so charts theme with the same CSS variables as the rest of Axon UI, work with dark mode, render on the server and stay light.

```bash
pnpm add @axonui/charts @axonui/core @axonui/theme
```

```tsx
import { ThemeProvider } from '@axonui/theme';
import { LineChart } from '@axonui/charts';
import '@axonui/theme/styles.css';
import '@axonui/core/styles.css';
import '@axonui/charts/styles.css';

const data = [
  { month: 'Jan', revenue: 120, costs: 88 },
  { month: 'Feb', revenue: 145, costs: 93 },
  { month: 'Mar', revenue: 165, costs: 96 },
];

export function Revenue() {
  return (
    <ThemeProvider>
      <LineChart
        data={data}
        xKey="month"
        series={[
          { key: 'revenue', name: 'Revenue' },
          { key: 'costs', name: 'Costs' },
        ]}
        title="Revenue and costs"
        valueFormat="$,.0f"
      />
    </ThemeProvider>
  );
}
```

`@axonui/charts/styles.css` builds on `@axonui/core/styles.css` and the theme tokens, so load those too. The d3 modules are bundled into this package, so there is nothing else to install.

## The charts

| Chart                    | For                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `LineChart`              | Trends over a category, number or date axis. Curves, dots, gaps or connected nulls.                   |
| `AreaChart`              | The same, filled; overlapping, stacked, or 100% stacked (shares).                                     |
| `BarChart`               | Grouped, stacked or 100% stacked bars, vertical or horizontal, with negatives and values on the bars. |
| `ComboChart`             | Bars, lines and areas together, with a second value axis on the right.                                |
| `PieChart`, `DonutChart` | Shares of a whole. Leader-line labels, a total in the middle of a donut.                              |
| `ScatterChart`           | Two numbers per point, optionally sized by a third and colored by a category.                         |
| `RadarChart`             | Several measures of one thing on spokes, one shape per series.                                        |
| `Gauge`                  | One value on a dial, with colored bands.                                                              |
| `Sparkline`              | A tiny trend for a table cell or a line of text.                                                      |
| `Heatmap`                | A grid of cells shaded by value; in `calendar` mode, days in weeks like a contribution graph.         |
| `StatCard`               | A KPI: a figure, how it changed, and a trend.                                                         |

## The data

Every chart takes `data`, an array of plain objects, and names the keys it should read.

```tsx
<BarChart data={rows} xKey="quarter" series={[{ key: 'north', name: 'North' }, { key: 'south' }]} />
<PieChart data={[{ name: 'Chrome', value: 6480 }, { name: 'Safari', value: 2290 }]} />
<ScatterChart data={rows} xKey="spend" yKey="conversions" sizeKey="revenue" colorKey="channel" />
```

A `series` entry is `{ key, name?, color?, format? }`. The name defaults to the key, the color to the next palette color, and `format` is a number format for that series in tooltips and the data table. Missing, `null` and non-numeric values leave a gap rather than drawing as zero. An x value can be text, a number or a `Date`: dates and numbers are placed by value (lines and areas sort them for you), text is placed in the order it appears.

### Formatting numbers

Formats are [d3-format](https://d3js.org/d3-format) specifiers, or your own function:

| Specifier | Gives                  | Use for                |
| --------- | ---------------------- | ---------------------- |
| `,.0f`    | `1,234`                | counts                 |
| `$,.2f`   | `$1,234.50`            | money                  |
| `~s`      | `1.2k`, `3.4M`         | big numbers on an axis |
| `.1%`     | `12.5%` (from `0.125`) | rates                  |
| `+,.0f`   | `+1,234`               | changes                |

`valueFormat` sets the format for tooltips and the data table; each axis has its own `tickFormat`.

## Props every chart shares

| Prop                                                          | What it does                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `height`, `width`                                             | Height in pixels (default 300). Without `width` the chart fills its parent and follows it as it resizes. |
| `title`, `description`                                        | Shown above the chart and used in its accessible name.                                                   |
| `loading`                                                     | Shows a placeholder.                                                                                     |
| `emptyState`                                                  | Replaces the "No data to display" message.                                                               |
| `animate`                                                     | Draws marks in. Never animates for people who prefer reduced motion. Default `true`.                     |
| `legend`                                                      | `false`, `'top'` or `'bottom'`. Shown by default when there is more than one series.                     |
| `hiddenSeries`, `defaultHiddenSeries`, `onHiddenSeriesChange` | Which series the legend has switched off, controlled or not.                                             |
| `tooltip`                                                     | Turns the shared tooltip off.                                                                            |
| `xAxis`, `yAxis`                                              | `false` to hide, or `{ label, tickFormat, tickCount, grid }`.                                            |
| `dataTable`                                                   | A visually hidden table of the data (see below). Default: on for 50 rows or fewer.                       |
| `locale`                                                      | For dates and numbers.                                                                                   |
| `labels`                                                      | The words charts use ("No data to display", the legend's name, the keyboard hint), for translation.      |

Charts that have an x axis (`LineChart`, `AreaChart`, `BarChart`, `ComboChart`) also take `onPointClick(datum, index)`.

## Accessibility

A chart is a picture, so the work is giving everyone the same information another way.

- **A name that says something.** Each chart is one `role="img"` named by a generated summary: what kind of chart, how many series and points, the span of the x axis and where each series peaks and bottoms out ("Line chart with 2 series: Revenue, Costs. 12 data points from Jan to Dec. Revenue ranges from 120 at Jan to 284 at Dec…"). Pass `ariaLabel` to write your own. The summary is in English; pass your own for other languages.
- **A table of the numbers.** By default (for 50 rows or fewer) a real `<table>` of the data sits next to the chart, visible only to assistive technology. `dataTable` forces it on or off.
- **A way to read points without a mouse.** The chart takes focus. The arrow keys step through the data points, showing the tooltip and announcing the point in a polite live region (once per move, never while the pointer is used); Home and End jump to the ends, Enter chooses the point and Escape lets go. Pies and radars step round, heatmaps move across cells.
- **Legends are real buttons** with `aria-pressed`, so switching a series off is a keyboard action too.
- **Color is not the only signal.** Series have names in the legend, tooltips and table; a `StatCard` says "Up" or "Down" in text as well as with an arrow and a color; the `Gauge` is a `role="meter"` with its value, range and band.
- **Reduced motion** turns every animation off.

## Colors and dark mode

Series use eight colors, `--axon-chart-1` to `--axon-chart-8`, defined from the theme's color scales and switched to lighter steps in dark mode. Override any of them above a chart (`.my-dashboard { --axon-chart-1: teal; }`), or give a series its own `color`. Axes, grid lines and tooltips use the theme's border, text and surface tokens.

## Server rendering

Charts render the same markup on the server and in the browser. Until a chart has been measured (and wherever `ResizeObserver` does not exist) it uses a width of 600; pass `width` for a fixed size. Nothing reads `window` while rendering.

## Building your own

The parts the charts are made of are exported: `ResponsiveContainer`, `XAxis` and `YAxis` (with `xScaleTicks` and `yScaleTicks`), `Legend`, `Tooltip`, `CrosshairCursor`, and the math, `createXScale`, `createYScale`, `computeDomain`, `stackSeries`, `nearestIndex`. The "Building blocks" story builds a lollipop chart from them in under a hundred lines.

## Sizes

Charts that draw many marks (a scatter of thousands of points, a year of calendar cells) render one SVG element per mark, which is comfortable up to a few thousand. Past that, thin the data before charting it.
