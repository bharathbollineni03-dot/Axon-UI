import {
  forwardRef,
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useControllableState } from '../../hooks/useControllableState';
import { Field, useFieldIds } from '../../internal/Field/Field';

export type OTPInputType = 'numeric' | 'alphanumeric' | 'text';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the first box.
 */
export interface OTPInputProps {
  /** Number of boxes. Defaults to 6. */
  length?: number;
  /** The code entered so far (at most `length` characters). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  /** Which characters are accepted: digits only (default), letters and digits, or anything. */
  type?: OTPInputType;
  /** Hides the entered characters, like a password field. */
  mask?: boolean;
  /** Focuses the first empty box on mount. */
  autoFocus?: boolean;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  color?: AxonColor;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Submitted with forms as a hidden input holding the whole code. */
  name?: string;
  id?: string;
  /** Names the group when there is no visible `label`. */
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Accessible name of each box, e.g. for translation. */
  getBoxLabel?: (index: number, length: number) => string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
  style?: CSSProperties;
}

const SANITIZERS: Record<OTPInputType, (text: string) => string> = {
  numeric: (text) => text.replace(/\D/g, ''),
  alphanumeric: (text) => text.replace(/[^a-z0-9]/gi, ''),
  text: (text) => text.replace(/\s/g, ''),
};

/**
 * One-time-code input: one box per character that advances as you type, steps back on Backspace,
 * and accepts a pasted (or autofilled) code in one go. The code is contiguous: boxes fill left to
 * right, and clicking an empty box further along focuses the first empty one.
 */
export const OTPInput = forwardRef<HTMLInputElement, OTPInputProps>(function OTPInput(
  {
    length = 6,
    value: valueProp,
    defaultValue = '',
    onChange,
    onComplete,
    type = 'numeric',
    mask = false,
    autoFocus = false,
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    color = 'primary',
    disabled = false,
    readOnly = false,
    required = false,
    name,
    id: idProp,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    getBoxLabel = (index, total) =>
      `${type === 'numeric' ? 'Digit' : 'Character'} ${index + 1} of ${total}`,
    onBlur,
    className,
    style,
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const sanitize = SANITIZERS[type];
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const [value, setValue] = useControllableState<string>({
    value: valueProp === undefined ? undefined : sanitize(valueProp).slice(0, length),
    defaultValue: sanitize(defaultValue).slice(0, length),
    onChange,
  });

  // Updated synchronously so focus handlers fired in the same event see the new length.
  const valueRef = useRef(value);
  valueRef.current = value;

  const focusBox = (index: number) => {
    const target = boxes.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  useEffect(() => {
    if (autoFocus) focusBox(value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: string) => {
    const clean = next.slice(0, length);
    if (clean === valueRef.current) return;
    valueRef.current = clean;
    setValue(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  /** Writes `text` into the code starting at box `index`, overwriting what is there. */
  const insert = (index: number, text: string) => {
    const incoming = sanitize(text);
    if (!incoming) return false;
    update(value.slice(0, index) + incoming + value.slice(index + incoming.length));
    focusBox(index + incoming.length);
    return true;
  };

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const raw = event.target.value;
    if (raw === '') {
      // The box was emptied (cut, or select-all + delete).
      update(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // A single new character replaces the box; several (autofill, a paste into one box) spread out.
    insert(index, raw.length > 1 ? raw : raw.slice(-1));
  };

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (disabled || readOnly) return;
    insert(index, event.clipboardData.getData('text'));
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'Backspace':
        if (readOnly) return;
        event.preventDefault();
        if (index < value.length) {
          update(value.slice(0, index) + value.slice(index + 1));
        } else if (index > 0) {
          update(value.slice(0, index - 1));
          focusBox(index - 1);
        }
        break;
      case 'Delete':
        if (readOnly) return;
        event.preventDefault();
        update(value.slice(0, index) + value.slice(index + 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusBox(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusBox(Math.min(index + 1, value.length));
        break;
      case 'Home':
        event.preventDefault();
        focusBox(0);
        break;
      case 'End':
        event.preventDefault();
        focusBox(value.length);
        break;
    }
  };

  const handleFocus = (index: number) => (event: FocusEvent<HTMLInputElement>) => {
    // Keep the code contiguous: an empty box beyond the next one hands focus to that one.
    if (index > valueRef.current.length) focusBox(valueRef.current.length);
    else event.target.select();
  };

  const message = error && errorMessage ? errorMessage : helperText;

  return (
    <Field
      baseClass="axon-otp-input"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      message={message}
      className={cx(
        `axon-otp-input--${size}`,
        `axon-otp-input--${color}`,
        error && 'axon-otp-input--error',
        className,
      )}
      style={style}
    >
      <div
        role="group"
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={label ? undefined : (ariaLabel ?? 'One-time code')}
        aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
        className="axon-otp-input__boxes"
      >
        {Array.from({ length }, (_, index) => {
          const char = value[index] ?? '';
          return (
            <input
              key={index}
              ref={(node) => {
                boxes.current[index] = node;
                if (index === 0) {
                  if (typeof ref === 'function') ref(node);
                  else if (ref) ref.current = node;
                }
              }}
              id={index === 0 ? id : `${id}-${index}`}
              type={mask ? 'password' : 'text'}
              inputMode={type === 'numeric' ? 'numeric' : 'text'}
              autoComplete={index === 0 && !mask ? 'one-time-code' : 'off'}
              autoCapitalize="off"
              spellCheck={false}
              aria-label={getBoxLabel(index, length)}
              aria-invalid={error || undefined}
              aria-required={required || undefined}
              value={char}
              disabled={disabled}
              readOnly={readOnly}
              className={cx('axon-otp-input__box', char && 'axon-otp-input__box--filled')}
              onChange={handleChange(index)}
              onPaste={handlePaste(index)}
              onKeyDown={handleKeyDown(index)}
              onFocus={handleFocus(index)}
              onBlur={onBlur}
            />
          );
        })}
      </div>
      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </Field>
  );
});
