import { useId, type CSSProperties, type ReactNode } from 'react';
import { Skeleton } from '@axon/core';
import { defaultChartLabels, type ChartLabels } from '../../types';
import { ResponsiveContainer, type ChartSize } from '../ResponsiveContainer/ResponsiveContainer';

export interface ChartFrameProps {
  /** A short name for the kind of chart, used in a class name: `line`, `bar`, `pie`. */
  kind: string;
  width?: number;
  height: number;
  fallbackWidth?: number;
  /** Shows a placeholder instead of the chart. */
  loading?: boolean;
  /** Shows `emptyState` instead of the chart. */
  empty?: boolean;
  emptyState?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** The legend, shown above or below the plot. */
  legend?: ReactNode;
  legendPosition?: 'top' | 'bottom';
  /** The hidden data table, for screen readers. */
  dataTable?: ReactNode;
  /** Whether marks animate in. */
  animate?: boolean;
  labels?: Partial<ChartLabels>;
  className?: string;
  style?: CSSProperties;
  /** Draws the plot: the `<svg>` and anything laid over it, given the size to fill. */
  children: (size: ChartSize) => ReactNode;
}

/**
 * The shell every chart sits in: a figure with a title and description, a loading placeholder,
 * an empty state, a legend slot, the plot at the width of its parent, and a hidden data table.
 * It knows nothing about what is drawn; the chart does that in `children`.
 */
export function ChartFrame({
  kind,
  width,
  height,
  fallbackWidth,
  loading = false,
  empty = false,
  emptyState,
  title,
  description,
  legend,
  legendPosition = 'bottom',
  dataTable,
  animate = false,
  labels: labelsProp,
  className,
  style,
  children,
}: ChartFrameProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const captionId = useId();
  const hasCaption = Boolean(title || description);

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="axon-chart__status" style={{ height }} role="status">
        <Skeleton variant="rect" width="100%" height={height} />
        <span className="axon-visually-hidden">{labels.loading}</span>
      </div>
    );
  } else if (empty) {
    body = (
      <div className="axon-chart__status" style={{ height }}>
        {emptyState ?? labels.empty}
      </div>
    );
  } else {
    body = (
      <>
        {legendPosition === 'top' ? legend : null}
        <div className="axon-chart__plot">
          <ResponsiveContainer height={height} width={width} fallbackWidth={fallbackWidth}>
            {children}
          </ResponsiveContainer>
        </div>
        {legendPosition === 'bottom' ? legend : null}
        {dataTable}
      </>
    );
  }

  return (
    <figure
      className={[
        'axon-chart',
        `axon-chart--${kind}`,
        animate && !loading ? 'axon-chart--animate' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-busy={loading || undefined}
      aria-labelledby={hasCaption ? captionId : undefined}
    >
      {hasCaption ? (
        <figcaption id={captionId} className="axon-chart__caption">
          {title ? <span className="axon-chart__title">{title}</span> : null}
          {description ? <span className="axon-chart__description">{description}</span> : null}
        </figcaption>
      ) : null}
      {body}
    </figure>
  );
}
