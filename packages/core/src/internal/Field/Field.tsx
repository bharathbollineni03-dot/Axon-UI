import { useId, type CSSProperties, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { Label } from '../../components/Label';

export type InputVariant = 'outline' | 'filled';

/** Ids shared by a field's control, message and counter (for `htmlFor` / `aria-describedby`). */
export function useFieldIds(idProp?: string) {
  const generated = useId();
  const id = idProp ?? generated;
  return { id, messageId: `${id}-message`, counterId: `${id}-counter` };
}

export interface InputBoxOptions {
  size: AxonSize;
  variant: InputVariant;
  color: AxonColor;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

/** Class names for the bordered box around a text-like control. */
export function inputBoxClassName({
  size,
  variant,
  color,
  error,
  disabled,
  readOnly,
  className,
}: InputBoxOptions) {
  return cx(
    'axon-input',
    `axon-input--${size}`,
    `axon-input--${variant}`,
    `axon-input--${color}`,
    error && 'axon-input--error',
    disabled && 'axon-input--disabled',
    readOnly && 'axon-input--readonly',
    className,
  );
}

export interface FieldProps {
  /** BEM block of the component using the field, e.g. `axon-text-field`. */
  baseClass: string;
  id: string;
  messageId: string;
  counterId: string;
  label?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  /** Helper text, or the error message while in the error state. */
  message?: ReactNode;
  counter?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Shared layout for form controls: label above, control, then a message line and counter.
 * The message region is always rendered and polite-live so errors are announced when they appear.
 */
export function Field({
  baseClass,
  id,
  messageId,
  counterId,
  label,
  required,
  disabled,
  error,
  fullWidth,
  message,
  counter,
  className,
  style,
  children,
}: FieldProps) {
  const hasMessage =
    message !== undefined && message !== null && message !== false && message !== '';
  return (
    <div
      className={cx(
        'axon-field',
        baseClass,
        fullWidth && 'axon-field--full-width',
        disabled && 'axon-field--disabled',
        error && 'axon-field--error',
        className,
      )}
      style={style}
    >
      {label ? (
        <Label
          id={`${id}-label`}
          htmlFor={id}
          required={required}
          disabled={disabled}
          className="axon-field__label"
        >
          {label}
        </Label>
      ) : null}
      {children}
      <div className="axon-field__footer">
        <div
          id={messageId}
          className={cx('axon-field__message', error && 'axon-field__message--error')}
          aria-live="polite"
        >
          {hasMessage ? message : null}
        </div>
        {counter !== undefined ? (
          <span id={counterId} className="axon-field__counter">
            {counter}
          </span>
        ) : null}
      </div>
    </div>
  );
}
