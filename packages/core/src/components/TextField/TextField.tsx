import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds, setNativeInputValue } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { CloseIcon, EyeIcon, EyeOffIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';

export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the `<input>`;
 * every other prop (name, placeholder, autoComplete, aria-*, event handlers, ...) goes to
 * the `<input>` itself.
 */
export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color' | 'type' | 'prefix'
> {
  type?: TextFieldType;
  label?: ReactNode;
  helperText?: ReactNode;
  /** Puts the field in the error state (red border, `aria-invalid`). */
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  /** Accent for the focused border. The error state always uses `danger`. */
  color?: AxonColor;
  fullWidth?: boolean;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  /** Shows a button that empties the field. */
  clearable?: boolean;
  onClear?: () => void;
  /** Shows a character counter (`n` or `n / maxLength`). */
  showCount?: boolean;
  clearLabel?: string;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    type = 'text',
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    startAdornment,
    endAdornment,
    clearable = false,
    onClear,
    showCount = false,
    clearLabel = 'Clear',
    showPasswordLabel = 'Show password',
    hidePasswordLabel = 'Hide password',
    id: idProp,
    value,
    defaultValue,
    onChange,
    disabled = false,
    readOnly = false,
    required = false,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRef(ref, inputRef);

  // Mirror the length so the counter and clear button work in uncontrolled mode too.
  const isControlled = value !== undefined;
  const [uncontrolledLength, setUncontrolledLength] = useState(
    () => String(defaultValue ?? '').length,
  );
  const length = isControlled ? String(value).length : uncontrolledLength;

  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && passwordVisible ? 'text' : type;

  const showError = error;
  const message = showError && errorMessage ? errorMessage : helperText;
  const hasMessage = Boolean(message);
  const counter = showCount
    ? `${length}${inputProps.maxLength !== undefined ? ` / ${inputProps.maxLength}` : ''}`
    : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setUncontrolledLength(event.target.value.length);
    onChange?.(event);
  };

  const handleClear = () => {
    const input = inputRef.current;
    if (!input) return;
    setNativeInputValue(input, '');
    input.focus();
    onClear?.();
  };

  // Clicking the padding or an adornment should still focus the input.
  const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, button') || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const canClear = clearable && length > 0 && !disabled && !readOnly;

  return (
    <Field
      baseClass="axon-text-field"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={showError}
      fullWidth={fullWidth}
      message={message}
      counter={counter}
      className={className}
      style={style}
    >
      {/* The mouse handler only forwards clicks to the input; the input stays the focus target. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={inputBoxClassName({
          size,
          variant,
          color,
          error: showError,
          disabled,
          readOnly,
        })}
        onMouseDown={handleBoxMouseDown}
      >
        {startAdornment ? <span className="axon-input__adornment">{startAdornment}</span> : null}
        <input
          {...inputProps}
          ref={mergedRef}
          id={id}
          type={inputType}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={showError || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            hasMessage && messageId,
            showCount && counterId,
          )}
          className="axon-input__field"
        />
        {canClear ? (
          <button
            type="button"
            className="axon-input__action"
            aria-label={clearLabel}
            onClick={handleClear}
          >
            <CloseIcon />
          </button>
        ) : null}
        {isPassword ? (
          <button
            type="button"
            className="axon-input__action"
            aria-label={passwordVisible ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={passwordVisible}
            disabled={disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
        {endAdornment ? <span className="axon-input__adornment">{endAdornment}</span> : null}
      </div>
    </Field>
  );
});
