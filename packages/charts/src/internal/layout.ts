export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The text size of axis labels, in pixels. The stylesheet uses the same. */
export const AXIS_FONT_SIZE = 12;

/**
 * An estimate of how wide a text will be, without touching the DOM, so layout is the same on the
 * server and in the browser. It errs a little wide.
 */
export function estimateTextWidth(text: string, fontSize = AXIS_FONT_SIZE): number {
  return text.length * fontSize * 0.6;
}

export interface MarginInput {
  /** The labels of the left y axis, which decide how much room it needs. */
  leftLabels?: readonly string[];
  /** The labels of a right y axis. */
  rightLabels?: readonly string[];
  showXAxis?: boolean;
  /** A title under the x axis. */
  xLabel?: boolean;
  /** A title beside the left y axis. */
  yLabel?: boolean;
  /** A title beside the right y axis. */
  y2Label?: boolean;
  /** Replaces any side. */
  override?: Partial<Margin>;
}

const TICK_LENGTH = 6;
const LABEL_GAP = 4;
const TITLE_SIZE = 18;
const PADDING = 8;

/** The room around the plot area for axes, their labels and titles. */
export function resolveMargin({
  leftLabels = [],
  rightLabels = [],
  showXAxis = true,
  xLabel = false,
  yLabel = false,
  y2Label = false,
  override,
}: MarginInput = {}): Margin {
  const widest = (labels: readonly string[]) =>
    labels.reduce((max, label) => Math.max(max, estimateTextWidth(label)), 0);
  const left = leftLabels.length
    ? Math.ceil(widest(leftLabels)) + TICK_LENGTH + LABEL_GAP + (yLabel ? TITLE_SIZE : 0)
    : yLabel
      ? TITLE_SIZE
      : 0;
  const right = rightLabels.length
    ? Math.ceil(widest(rightLabels)) + TICK_LENGTH + LABEL_GAP + (y2Label ? TITLE_SIZE : 0)
    : 0;
  const bottom = showXAxis
    ? AXIS_FONT_SIZE + TICK_LENGTH + LABEL_GAP + (xLabel ? TITLE_SIZE : 0)
    : 0;
  return {
    top: PADDING,
    right: right + PADDING,
    bottom: bottom + PADDING,
    left: left + PADDING,
    ...override,
  };
}
