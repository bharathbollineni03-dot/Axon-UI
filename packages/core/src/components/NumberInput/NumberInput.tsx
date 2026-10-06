import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { ChevronDownIcon, ChevronUpIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the `<input>`;
 * every other prop goes to the `<input>` itself.
 */
export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'size'
  | 'color'
  | 'type'
  | 'prefix'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'min'
  | 'max'
  | 'step'
> {
  /** Controlled value; `null` is an empty field. */
  value?: number | null;
  defaultValue?: number | null;
  /**
   * Called with the parsed number as the user types (unclamped) and again, clamped and rounded,
   * when the value is committed by blur, Enter, the steppers or the arrow keys.
   * Partial input such as "-" or "1." does not fire it.
   */
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Amount added or removed by the steppers and arrow keys. Defaults to 1. */
  step?: number;
  /** Fixed number of decimal places used to round and display the value. */
  precision?: number;
  hideSteppers?: boolean;
  incrementLabel?: string;
  decrementLabel?: string;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  color?: AxonColor;
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

const decimalPlaces = (n: number) => {
  const text = String(n);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
};

const roundTo = (n: number, places: number) => Number(n.toFixed(Math.min(places, 20)));

const formatValue = (value: number | null, precision?: number) =>
  value === null ? '' : precision !== undefined ? value.toFixed(precision) : String(value);

/** `null` for an empty string, `undefined` for partial input such as "-" or "1.", else a number. */
function parseText(text: string): number | null | undefined {
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && /\d/.test(text) ? parsed : undefined;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value: valueProp,
    defaultValue,
    onChange,
    min,
    max,
    step = 1,
    precision,
    hideSteppers = false,
    incrementLabel = 'Increase',
    decrementLabel = 'Decrease',
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    id: idProp,
    disabled = false,
    readOnly = false,
    required = false,
    className,
    style,
    onBlur,
    onKeyDown,
    'aria-describedby': ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRef(ref, inputRef);

  const [value, setValue] = useControllableState<number | null>({
    value: valueProp,
    defaultValue: defaultValue ?? null,
    onChange,
  });
  const [text, setText] = useState(() => formatValue(value, precision));

  // Re-sync the text when the value changes from outside (e.g. a controlled parent resets it).
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(formatValue(value, precision));
    }
  }, [value, precision]);

  const allowNegative = min === undefined || min < 0;
  const allowDecimal = precision !== 0;
  const allowedText = new RegExp(
    `^${allowNegative ? '-?' : ''}\\d*${allowDecimal ? '\\.?\\d*' : ''}$`,
  );

  const normalize = (n: number) => {
    const rounded = precision !== undefined ? roundTo(n, precision) : n;
    return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, rounded));
  };

  const emit = (next: number | null) => {
    lastEmitted.current = next;
    setValue(next);
  };

  const commit = (candidate?: number | null) => {
    const parsed = candidate !== undefined ? candidate : parseText(text);
    const base = parsed === undefined ? value : parsed;
    const next = base === null ? null : normalize(base);
    emit(next);
    setText(formatValue(next, precision));
  };

  const stepBy = (direction: 1 | -1, multiplier = 1) => {
    if (disabled || readOnly) return;
    const typed = parseText(text);
    const current = typed === undefined ? value : typed;
    const places = precision ?? Math.max(decimalPlaces(step), decimalPlaces(current ?? 0));
    const next = normalize(roundTo((current ?? 0) + direction * step * multiplier, places));
    emit(next);
    setText(formatValue(next, precision));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!allowedText.test(next)) return;
    setText(next);
    const parsed = parseText(next);
    if (parsed !== undefined) emit(parsed);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commit();
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    const multiplier = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        stepBy(1, multiplier);
        break;
      case 'ArrowDown':
        event.preventDefault();
        stepBy(-1, multiplier);
        break;
      case 'PageUp':
        event.preventDefault();
        stepBy(1, 10);
        break;
      case 'PageDown':
        event.preventDefault();
        stepBy(-1, 10);
        break;
      case 'Home':
        if (min !== undefined) {
          event.preventDefault();
          commit(min);
        }
        break;
      case 'End':
        if (max !== undefined) {
          event.preventDefault();
          commit(max);
        }
        break;
      case 'Enter':
        commit();
        break;
    }
  };

  // Keep focus (and the caret) in the input when a stepper is pressed with the mouse.
  const keepInputFocus = (event: MouseEvent) => event.preventDefault();

  const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('input, button') || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const message = error && errorMessage ? errorMessage : helperText;
  const atMax = value !== null && max !== undefined && value >= max;
  const atMin = value !== null && min !== undefined && value <= min;
  const showSteppers = !hideSteppers && !readOnly;

  return (
    <Field
      baseClass="axon-number-input"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth={fullWidth}
      message={message}
      className={className}
      style={style}
    >
      {/* The mouse handler only forwards clicks to the input, which stays the focus target. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={inputBoxClassName({
          size,
          variant,
          color,
          error,
          disabled,
          readOnly,
          className: showSteppers ? 'axon-number-input__box--steppers' : undefined,
        })}
        onMouseDown={handleBoxMouseDown}
      >
        <input
          autoComplete="off"
          {...inputProps}
          ref={mergedRef}
          id={id}
          type="text"
          role="spinbutton"
          inputMode={precision === 0 ? 'numeric' : 'decimal'}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-valuenow={value ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          className="axon-input__field"
        />
        {showSteppers ? (
          <div className="axon-number-input__steppers">
            <button
              type="button"
              tabIndex={-1}
              className="axon-number-input__stepper"
              aria-label={incrementLabel}
              aria-controls={id}
              disabled={disabled || atMax}
              onMouseDown={keepInputFocus}
              onClick={() => stepBy(1)}
            >
              <ChevronUpIcon />
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="axon-number-input__stepper"
              aria-label={decrementLabel}
              aria-controls={id}
              disabled={disabled || atMin}
              onMouseDown={keepInputFocus}
              onClick={() => stepBy(-1)}
            >
              <ChevronDownIcon />
            </button>
          </div>
        ) : null}
      </div>
    </Field>
  );
});
