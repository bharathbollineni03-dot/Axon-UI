import { forwardRef, type HTMLAttributes } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  size?: AxonSize;
  /** `inherit` takes the color of the surrounding text, for a spinner inside a colored surface. */
  color?: AxonColor | 'inherit';
  /** What screen readers announce. */
  label?: string;
  /**
   * Hides the spinner from assistive technology. Use it when the busy state is already announced
   * some other way, for example by `aria-busy` on the region that is loading.
   */
  decorative?: boolean;
}

/** An indeterminate loading indicator. It is a polite `role="status"` with a text label. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { size = 'md', color = 'primary', label = 'Loading', decorative = false, className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative ? true : undefined}
      className={cx('axon-spinner', `axon-spinner--${size}`, `axon-spinner--${color}`, className)}
    >
      <svg className="axon-spinner__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle className="axon-spinner__track" cx="12" cy="12" r="10" />
        <circle className="axon-spinner__arc" cx="12" cy="12" r="10" pathLength={100} />
      </svg>
      {decorative ? null : <span className="axon-visually-hidden">{label}</span>}
    </span>
  );
});
