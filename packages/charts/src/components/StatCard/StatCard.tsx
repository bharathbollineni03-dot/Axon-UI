import { useId, useMemo, type ReactNode } from 'react';
import { Card, CardContent, Skeleton, type CardOwnProps } from '@axonui/core';
import { createNumberFormatter, isFiniteNumber, type ValueFormat } from '../../internal/format';
import type { CurveType } from '../../internal/curves';
import { Sparkline } from '../Sparkline/Sparkline';

export interface StatCardLabels {
  increase: string;
  decrease: string;
  noChange: string;
  loading: string;
}

export const defaultStatCardLabels: StatCardLabels = {
  increase: 'Up',
  decrease: 'Down',
  noChange: 'No change',
  loading: 'Loading',
};

export interface StatCardProps extends Pick<
  CardOwnProps,
  'variant' | 'elevation' | 'className' | 'style'
> {
  /** What is measured: "Revenue", "Active users". */
  title: ReactNode;
  /** The figure. A number is formatted with `valueFormat`; anything else is shown as it is. */
  value: ReactNode;
  /** Formats a number `value`: a d3-format specifier such as `$,.0f` or `~s`, or a function. */
  valueFormat?: ValueFormat;
  /**
   * The change since the last period. A fraction by default (0.124 is +12.4%); pass `deltaFormat`
   * for an absolute change.
   */
  delta?: number;
  /** Formats `delta`. Defaults to `+.1%`. */
  deltaFormat?: ValueFormat;
  /** What the change is measured against: "vs last month". */
  deltaLabel?: string;
  /** Whether an increase is good news. Set it to false for costs, errors and churn. Defaults to true. */
  positiveIsGood?: boolean;
  /** Recent values, drawn as a tiny trend line next to the change. */
  sparkline?: readonly (number | null)[];
  sparklineType?: 'line' | 'area' | 'bar';
  sparklineCurve?: CurveType;
  /** A small note under the figure. */
  description?: ReactNode;
  /** An icon beside the title. Decorative: it is hidden from screen readers. */
  icon?: ReactNode;
  /** Shows placeholders. */
  loading?: boolean;
  labels?: Partial<StatCardLabels>;
}

type Direction = 'up' | 'down' | 'flat';
type Tone = 'good' | 'bad' | 'neutral';

const ArrowIcon = ({ direction }: { direction: Direction }) => (
  <svg
    className="axon-stat-card__arrow"
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
  >
    {direction === 'up' ? (
      <path
        d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : direction === 'down' ? (
      <path
        d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

/**
 * A KPI card: a figure with its name, how it changed and a tiny trend. The change says
 * "Up" or "Down" in text as well as with an arrow and a color, so none of them is the only signal.
 */
export function StatCard({
  title,
  value,
  valueFormat,
  delta,
  deltaFormat = '+.1%',
  deltaLabel,
  positiveIsGood = true,
  sparkline,
  sparklineType = 'area',
  sparklineCurve,
  description,
  icon,
  loading = false,
  labels: labelsProp,
  variant,
  elevation,
  className,
  style,
}: StatCardProps) {
  const labels = { ...defaultStatCardLabels, ...labelsProp };
  const titleId = useId();
  const formatValueText = useMemo(() => createNumberFormatter(valueFormat), [valueFormat]);
  const formatDelta = useMemo(() => createNumberFormatter(deltaFormat, '+.1%'), [deltaFormat]);

  const direction: Direction =
    !isFiniteNumber(delta) || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const tone: Tone =
    direction === 'flat' ? 'neutral' : (direction === 'up') === positiveIsGood ? 'good' : 'bad';
  const directionText =
    direction === 'up' ? labels.increase : direction === 'down' ? labels.decrease : labels.noChange;

  return (
    <Card
      variant={variant}
      elevation={elevation}
      className={['axon-stat-card', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      <CardContent>
        <div className="axon-stat-card__head">
          <span id={titleId} className="axon-stat-card__title">
            {title}
          </span>
          {icon ? (
            <span className="axon-stat-card__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div role="status">
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" />
            <span className="axon-visually-hidden">{labels.loading}</span>
          </div>
        ) : (
          <>
            <div className="axon-stat-card__value">
              {typeof value === 'number' ? formatValueText(value) : value}
            </div>
            {isFiniteNumber(delta) || deltaLabel || sparkline ? (
              <div className="axon-stat-card__foot">
                {isFiniteNumber(delta) ? (
                  <span
                    className="axon-stat-card__delta"
                    data-tone={tone}
                    data-direction={direction}
                  >
                    <ArrowIcon direction={direction} />
                    <span className="axon-visually-hidden">{directionText} </span>
                    {formatDelta(Math.abs(delta) === 0 ? 0 : delta)}
                  </span>
                ) : null}
                {deltaLabel ? (
                  <span className="axon-stat-card__delta-label">{deltaLabel}</span>
                ) : null}
                {sparkline && sparkline.length > 0 ? (
                  <Sparkline
                    className="axon-stat-card__sparkline"
                    data={sparkline}
                    type={sparklineType}
                    curve={sparklineCurve}
                    color={
                      tone === 'bad'
                        ? 'var(--axon-color-danger-solid)'
                        : tone === 'good'
                          ? 'var(--axon-color-success-solid)'
                          : undefined
                    }
                    decorative
                  />
                ) : null}
              </div>
            ) : null}
            {description ? <p className="axon-stat-card__description">{description}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
