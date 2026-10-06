import { forwardRef, useId, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';

export interface OptionGroupProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue' | 'value'
> {
  /** BEM block of the group, e.g. `axon-checkbox-group`. */
  block: string;
  label?: ReactNode;
  required?: boolean;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * A `<fieldset>` with a legend, a list of options and a polite-live message line. Shared by
 * CheckboxGroup and RadioGroup. Pass `role="radiogroup"` for radios.
 */
export const OptionGroup = forwardRef<HTMLFieldSetElement, OptionGroupProps>(function OptionGroup(
  {
    block,
    label,
    required,
    helperText,
    error,
    errorMessage,
    orientation = 'vertical',
    role,
    disabled,
    className,
    children,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error && errorMessage ? errorMessage : helperText;
  const isRadioGroup = role === 'radiogroup';

  return (
    <fieldset
      {...rest}
      ref={ref}
      role={role}
      disabled={disabled}
      // aria-invalid / aria-required are only valid on the radiogroup role; checkboxes carry their own.
      aria-invalid={isRadioGroup && error ? true : undefined}
      aria-required={isRadioGroup && required ? true : undefined}
      aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
      className={cx('axon-option-group', block, className)}
    >
      {label ? (
        <legend className="axon-label axon-option-group__legend">
          {label}
          {required ? (
            <span className="axon-label__required" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
      ) : null}
      <div className={cx('axon-option-group__items', `axon-option-group__items--${orientation}`)}>
        {children}
      </div>
      <div
        id={messageId}
        className={cx('axon-field__message', error && 'axon-field__message--error')}
        aria-live="polite"
      >
        {message || null}
      </div>
    </fieldset>
  );
});
