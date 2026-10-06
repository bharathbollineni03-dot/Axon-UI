import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Shows a required indicator. The control itself should also set `required`. */
  required?: boolean;
  /** Secondary text after the label, such as "Optional". It is part of the accessible name. */
  hint?: ReactNode;
  disabled?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required = false, hint, disabled = false, className, children, ...rest },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cx('axon-label', disabled && 'axon-label--disabled', className)}
      {...rest}
    >
      {children}
      {required ? (
        <span className="axon-label__required" aria-hidden="true">
          *
        </span>
      ) : null}
      {hint ? <span className="axon-label__hint">{hint}</span> : null}
    </label>
  );
});
