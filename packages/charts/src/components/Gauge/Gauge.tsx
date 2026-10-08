import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import { Skeleton, useMediaQuery } from '@axon/core';
import { createNumberFormatter, isFiniteNumber, type ValueFormat } from '../../internal/format';
import { chartColor } from '../../internal/palette';
import { arcPath, polarToCartesian, toRadians } from '../../internal/polar';
import { defaultChartLabels, type ChartLabels } from '../../types';

export interface GaugeThreshold {
  /** The value this band runs up to. A value up to and including it is in the band. */
  to: number;
  /** Any CSS color. */
  color: string;
  /** Names the band for screen readers, such as "Healthy". */
  label?: string;
}

export interface GaugeProps {
  /** The value to show, or `null` for no reading. */
  value: number | null;
  /** The value at the start of the arc. Defaults to 0. */
  min?: number;
  /** The value at the end of the arc. Defaults to 100. */
  max?: number;
  /**
   * Bands along the arc, in order, each up to a value, such as green to 60, amber to 85 and red
   * to 100. The arc shows the band the value is in.
   */
  thresholds?: readonly GaugeThreshold[];
  /** Says what is measured, under the number. */
  label?: ReactNode;
  /** A title above the gauge. */
  title?: string;
  /** Formats the number in the middle: a d3-format specifier or a function. Defaults to a plain number. */
  valueFormat?: ValueFormat;
  /** How much of a circle the arc covers, in degrees, from 90 to 300. Defaults to 180: a half circle. */
  angle?: number;
  /** Width in pixels. Defaults to 220. */
  width?: number;
  /** Thickness of the arc as a share of the radius. Defaults to 0.22. */
  thickness?: number;
  /** Shows the lowest and highest values at the ends of the arc. Defaults to true. */
  showLimits?: boolean;
  /** Color of the arc when there are no thresholds. Defaults to the first palette color. */
  color?: string;
  /** Replaces the name read out for the gauge. Defaults to the label or title. */
  ariaLabel?: string;
  loading?: boolean;
  animate?: boolean;
  /** Shown when `value` is `null`. */
  emptyState?: ReactNode;
  labels?: Partial<ChartLabels>;
  className?: string;
  style?: CSSProperties;
}

const PAD = 10;

/** The band a value falls in: the first whose limit it does not pass, or the last. */
export function bandFor(
  value: number,
  thresholds: readonly GaugeThreshold[],
): GaugeThreshold | undefined {
  return thresholds.find((band) => value <= band.to) ?? thresholds[thresholds.length - 1];
}

/**
 * A single value on a dial: a CPU load, a score, progress to a goal. It is a `meter`, which tells
 * assistive technology the value and its range, and the band it is in when there are thresholds.
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  thresholds,
  label,
  title,
  valueFormat,
  angle = 180,
  width = 220,
  thickness = 0.22,
  showLimits = true,
  color,
  ariaLabel,
  loading = false,
  animate = true,
  emptyState,
  labels: labelsProp,
  className,
  style,
}: GaugeProps) {
  const labels = { ...defaultChartLabels, ...labelsProp };
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const captionId = useId();
  const format = useMemo(() => createNumberFormatter(valueFormat, ',.1~f'), [valueFormat]);

  const sweep = toRadians(Math.min(300, Math.max(90, angle)));
  const start = -sweep / 2;
  const end = sweep / 2;
  const radius = Math.max(10, width / 2 - PAD);
  const ring = radius * Math.min(0.6, Math.max(0.05, thickness));
  const inner = radius - ring;
  const cx = width / 2;
  const cy = radius + PAD;
  const belowCenter = sweep > Math.PI ? -Math.cos(sweep / 2) * radius : 0;
  const height = cy + Math.max(belowCenter, 0) + (sweep <= Math.PI ? 34 : 20);

  const span = max - min || 1;
  const toAngle = (v: number) => start + ((Math.min(max, Math.max(min, v)) - min) / span) * sweep;
  const hasValue = isFiniteNumber(value);
  const band = hasValue && thresholds?.length ? bandFor(value, thresholds) : undefined;
  const fill = band?.color ?? color ?? chartColor(0);
  const text = hasValue ? format(value) : '';
  const valueText = hasValue
    ? `${text} of ${format(max)}${band?.label ? `, ${band.label}` : ''}`
    : 'No reading';
  const name = ariaLabel ?? (typeof label === 'string' ? label : title) ?? 'Gauge';

  const track = (from: number, to: number) =>
    arcPath({ innerRadius: inner, outerRadius: radius, startAngle: from, endAngle: to });

  let body: ReactNode;
  if (loading) {
    body = (
      <div role="status" style={{ width }}>
        <Skeleton variant="rect" width={width} height={height} />
        <span className="axon-visually-hidden">{labels.loading}</span>
      </div>
    );
  } else if (!hasValue) {
    body = (
      <div className="axon-chart__status" style={{ width, height }}>
        {emptyState ?? labels.empty}
      </div>
    );
  } else {
    const bandStart = (index: number) => (index === 0 ? min : thresholds![index - 1]!.to);
    body = (
      <svg
        className="axon-chart__svg axon-gauge"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="meter"
        aria-label={name}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
      >
        <g transform={`translate(${cx}, ${cy})`}>
          {thresholds?.length ? (
            thresholds.map((item, index) => (
              <path
                key={index}
                className="axon-gauge__band"
                d={track(toAngle(bandStart(index)), toAngle(item.to))}
                style={{ fill: item.color }}
              />
            ))
          ) : (
            <path className="axon-gauge__track" d={track(start, end)} />
          )}
          {value > min ? (
            <path
              className="axon-gauge__value"
              d={arcPath({
                innerRadius: inner,
                outerRadius: radius,
                startAngle: start,
                endAngle: toAngle(value),
                cornerRadius: Math.min(ring / 2, 6),
              })}
              style={{ fill }}
            />
          ) : null}
          {(() => {
            const tip = polarToCartesian(0, 0, radius + 5, toAngle(value));
            return thresholds?.length ? (
              <circle className="axon-gauge__marker" cx={tip.x} cy={tip.y} r={3} style={{ fill }} />
            ) : null;
          })()}
          <text
            className="axon-chart__center-value"
            textAnchor="middle"
            y={sweep <= Math.PI ? -radius * 0.08 : radius * 0.05}
            style={{ fontSize: Math.max(16, radius * 0.4) }}
          >
            {text}
          </text>
          {label ? (
            <text
              className="axon-chart__center-label"
              textAnchor="middle"
              y={sweep <= Math.PI ? radius * 0.2 : radius * 0.3}
            >
              {label}
            </text>
          ) : null}
          {showLimits
            ? [
                { v: min, angle: start },
                { v: max, angle: end },
              ].map((limit) => {
                const point = polarToCartesian(0, 0, (radius + inner) / 2, limit.angle);
                return (
                  <text
                    key={limit.angle}
                    className="axon-chart__tick-label"
                    x={point.x}
                    y={point.y + (sweep <= Math.PI ? 16 : 14)}
                    textAnchor="middle"
                  >
                    {format(limit.v)}
                  </text>
                );
              })
            : null}
        </g>
      </svg>
    );
  }

  return (
    <figure
      className={[
        'axon-chart',
        'axon-chart--gauge',
        animate && !reducedMotion && !loading ? 'axon-chart--animate' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ alignItems: 'center', width: 'fit-content', ...style }}
      aria-busy={loading || undefined}
      aria-labelledby={title ? captionId : undefined}
    >
      {title ? (
        <figcaption id={captionId} className="axon-chart__caption">
          <span className="axon-chart__title">{title}</span>
        </figcaption>
      ) : null}
      {body}
    </figure>
  );
}
