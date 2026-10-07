import { toNumber } from './format';
import type { ChartDatum } from './stack';

export interface SummarySeries {
  key: string;
  name: string;
}

export interface CartesianSummaryInput {
  /** "Line chart", "Bar chart" and so on. */
  kind: string;
  title?: string;
  description?: string;
  data: readonly ChartDatum[];
  xKey: string;
  series: readonly SummarySeries[];
  /** How an x value reads aloud. */
  formatX: (value: unknown) => string;
  formatValue: (value: number) => string;
}

/** Ends a title or description with a full stop, unless it already ends in punctuation. */
const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The most that is spelled out in full: more series than this are named but not described one by one. */
const DETAILED_SERIES = 3;

/**
 * A sentence or two that stands in for a chart, for its accessible name: what it is, how many
 * series and points it has, the span of the x axis, and where each of the first few series peaks
 * and bottoms out.
 */
export function describeCartesian({
  kind,
  title,
  description,
  data,
  xKey,
  series,
  formatX,
  formatValue,
}: CartesianSummaryInput): string {
  const parts: string[] = [];
  if (title) parts.push(sentence(title));
  const names = series.map((item) => item.name).join(', ');
  if (data.length === 0) {
    parts.push(`${kind} with no data.`);
  } else {
    parts.push(
      `${kind} with ${plural(series.length, 'series', 'series')}${names ? `: ${names}` : ''}.`,
    );
    const first = formatX(data[0]![xKey]);
    const last = formatX(data[data.length - 1]![xKey]);
    parts.push(
      data.length === 1
        ? `1 data point at ${first}.`
        : `${data.length} data points from ${first} to ${last}.`,
    );
    if (series.length <= DETAILED_SERIES) {
      for (const item of series) {
        const range = valueRange(data, xKey, item.key);
        if (!range) continue;
        parts.push(
          range.low.index === range.high.index
            ? `${item.name} is ${formatValue(range.low.value)} at ${formatX(data[range.low.index]![xKey])}.`
            : `${item.name} ranges from ${formatValue(range.low.value)} at ${formatX(
                data[range.low.index]![xKey],
              )} to ${formatValue(range.high.value)} at ${formatX(data[range.high.index]![xKey])}.`,
        );
      }
    }
  }
  if (description) parts.push(sentence(description));
  return parts.join(' ');
}

interface Extreme {
  value: number;
  index: number;
}

/** The lowest and highest value of a key, and where they are. `null` when there are no numbers. */
export function valueRange(
  data: readonly ChartDatum[],
  xKey: string,
  key: string,
): { low: Extreme; high: Extreme } | null {
  void xKey;
  let low: Extreme | null = null;
  let high: Extreme | null = null;
  data.forEach((datum, index) => {
    const value = toNumber(datum[key]);
    if (value === null) return;
    if (!low || value < low.value) low = { value, index };
    if (!high || value > high.value) high = { value, index };
  });
  return low && high ? { low, high } : null;
}
