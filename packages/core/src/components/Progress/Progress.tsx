import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { useId } from '../../hooks/useId';

interface ProgressBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'color' | 'children' | 'role'
> {
  /** Progress from 0 to `max`. Leave it out (or pass `null`) when the amount is not known. */
  value?: number | null;
  /** The value that means "done". Defaults to 100. */
  max?: number;
  variant?: 'linear' | 'circular';
  size?: AxonSize;
  color?: AxonColor;
  /** Shows the percentage: beside the label on a linear bar, in the middle of a circle. */
  showValue?: boolean;
  /** Text for the value, shown and announced. Defaults to a rounded percentage, such as "40%". */
  formatValue?: (value: number, max: number) => string;
}

/** A progress bar needs a name: a visible `label`, or an `aria-label` / `aria-labelledby`. */
type ProgressLabel =
  | { label: ReactNode }
  | { label?: undefined; 'aria-label': string }
  | { label?: undefined; 'aria-labelledby': string };

export type ProgressProps = ProgressBaseProps & ProgressLabel;

const defaultFormat = (value: number, max: number) => `${Math.round((value / max) * 100)}%`;

/**
 * Shows how far along a task is, as a bar or a ring. With a `value` it is determinate; without one
 * it animates to show that something is happening. It is a `progressbar` named by `label` (shown),
 * `aria-label` or `aria-labelledby`. Its value is announced as `aria-valuetext`, not live: update
 * a status message separately if you want to announce milestones.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    max = 100,
    variant = 'linear',
    size = 'md',
    color = 'primary',
    label,
    showValue = false,
    formatValue = defaultFormat,
    className,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  },
  ref,
) {
  const baseId = useId(id, 'axon-progress');
  const labelId = `${baseId}-label`;

  const safeMax = max > 0 ? max : 100;
  const determinate = value !== undefined && value !== null && Number.isFinite(value);
  const clamped = determinate ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percent = (clamped / safeMax) * 100;
  const valueText = determinate ? formatValue(clamped, safeMax) : undefined;

  const progressProps = {
    role: 'progressbar',
    'aria-label': label ? undefined : ariaLabel,
    'aria-labelledby': label ? labelId : ariaLabelledBy,
    'aria-valuemin': 0,
    'aria-valuemax': safeMax,
    'aria-valuenow': determinate ? clamped : undefined,
    'aria-valuetext': valueText,
  } as const;

  const visibleValue =
    showValue && valueText ? (
      <span className="axon-progress__value" aria-hidden="true">
        {valueText}
      </span>
    ) : null;

  return (
    <div
      {...rest}
      ref={ref}
      id={baseId}
      className={cx(
        'axon-progress',
        `axon-progress--${variant}`,
        `axon-progress--${size}`,
        `axon-progress--${color}`,
        !determinate && 'axon-progress--indeterminate',
        className,
      )}
    >
      {variant === 'linear' ? (
        <>
          {label || visibleValue ? (
            <div className="axon-progress__header">
              {label ? (
                <span id={labelId} className="axon-progress__label">
                  {label}
                </span>
              ) : null}
              {visibleValue}
            </div>
          ) : null}
          <div {...progressProps} className="axon-progress__track">
            <div
              className="axon-progress__bar"
              style={determinate ? { width: `${percent}%` } : undefined}
            />
          </div>
        </>
      ) : (
        <>
          <div {...progressProps} className="axon-progress__circle">
            <svg
              className="axon-progress__svg"
              viewBox="0 0 44 44"
              aria-hidden="true"
              focusable="false"
            >
              <circle className="axon-progress__track" cx="22" cy="22" r="18" />
              <circle
                className="axon-progress__bar"
                cx="22"
                cy="22"
                r="18"
                pathLength={100}
                strokeDashoffset={determinate ? 100 - percent : undefined}
              />
            </svg>
            {visibleValue}
          </div>
          {label ? (
            <span id={labelId} className="axon-progress__label">
              {label}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
});
