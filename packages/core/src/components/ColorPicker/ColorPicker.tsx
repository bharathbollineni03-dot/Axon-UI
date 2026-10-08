import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { defaultTheme, type PaletteName } from '@axonui/theme';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { normalizeHex, prefersDarkText } from '../../internal/color';
import { Field, inputBoxClassName, useFieldIds } from '../../internal/Field/Field';

export interface ColorSwatch {
  /** A hex color such as `#3b82f6`. */
  value: string;
  /** Accessible name of the swatch. Defaults to the hex value. */
  label?: string;
}

const PALETTE_LABELS: Record<PaletteName, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  info: 'Info',
  neutral: 'Neutral',
};

/** The default swatches: the theme palettes at shades 500 and 700. */
export const defaultSwatches: ColorSwatch[] = /* @__PURE__ */ ([500, 700] as const).flatMap(
  (shade) =>
    (Object.keys(PALETTE_LABELS) as PaletteName[]).map((name) => ({
      value: defaultTheme.palette[name][shade],
      label: `${PALETTE_LABELS[name]} ${shade}`,
    })),
);

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the hex `<input>`.
 */
export interface ColorPickerProps {
  /** A `#rrggbb` hex color, or `null` for none. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with a normalized lowercase `#rrggbb` color, or `null` when cleared. */
  onChange?: (value: string | null) => void;
  /** Colors offered as quick picks. Strings are treated as hex values. */
  swatches?: (string | ColorSwatch)[];
  /** Shows the browser's native color chooser for colors outside the swatches. Defaults to `true`. */
  allowCustom?: boolean;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  /** Accent for the focus and selection styles. */
  color?: AxonColor;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Submitted with forms as a hidden input holding the hex value. */
  name?: string;
  id?: string;
  swatchesLabel?: string;
  customLabel?: string;
  'aria-describedby'?: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
  style?: CSSProperties;
}

const toSwatch = (item: string | ColorSwatch): ColorSwatch | null => {
  const raw = typeof item === 'string' ? item : item.value;
  const value = normalizeHex(raw);
  if (!value) return null;
  return { value, label: typeof item === 'string' ? value : (item.label ?? value) };
};

/** Quick-pick swatches (a radio group) plus a hex text field and an optional native chooser. */
export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(function ColorPicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    swatches = defaultSwatches,
    allowCustom = true,
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    color = 'primary',
    fullWidth = false,
    disabled = false,
    required = false,
    name,
    id: idProp,
    swatchesLabel = 'Color swatches',
    customLabel = 'Custom color',
    'aria-describedby': ariaDescribedBy,
    onBlur,
    className,
    style,
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(ref, inputRef);
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const list = useMemo(
    () => swatches.map(toSwatch).filter((swatch): swatch is ColorSwatch => swatch !== null),
    [swatches],
  );

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp === undefined ? undefined : valueProp && normalizeHex(valueProp),
    defaultValue: defaultValue && normalizeHex(defaultValue),
  });
  const [text, setText] = useState(value ?? '');

  const lastSeen = useRef(value);
  useIsomorphicLayoutEffect(() => {
    if (value === lastSeen.current) return;
    lastSeen.current = value;
    setText(value ?? '');
  }, [value]);

  const commit = (next: string | null) => {
    if (next !== value) {
      setValue(next);
      onChange?.(next);
    }
  };

  const typedHex = normalizeHex(text);

  // A full six-digit color commits as you type. Shorthand (#abc) waits for blur or Enter, because
  // typing #3b82f6 passes through the valid shorthand #3b8 on the way.
  const handleTextChange = (next: string) => {
    setText(next);
    if (/^#?[0-9a-f]{6}$/i.test(next.trim())) commit(normalizeHex(next));
  };

  const commitText = () => {
    if (text.trim() === '') commit(null);
    else if (typedHex) {
      commit(typedHex);
      setText(typedHex);
    } else setText(value ?? '');
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commitText();
    onBlur?.(event);
  };

  const selectedIndex = list.findIndex((swatch) => swatch.value === value);
  const handleSwatchKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % list.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + list.length) % list.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = list.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    swatchRefs.current[next]?.focus();
    commit(list[next]!.value);
  };

  const message = error && errorMessage ? errorMessage : helperText;
  const previewColor = typedHex ?? value;

  return (
    <Field
      baseClass="axon-color-picker"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth={fullWidth}
      message={message}
      className={cx(`axon-color-picker--${size}`, `axon-color-picker--${color}`, className)}
      style={style}
    >
      {list.length > 0 ? (
        <div role="radiogroup" aria-label={swatchesLabel} className="axon-color-picker__swatches">
          {list.map((swatch, index) => {
            const selected = swatch.value === value;
            return (
              <button
                key={swatch.value}
                ref={(node) => {
                  swatchRefs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={swatch.label}
                tabIndex={selected || (selectedIndex < 0 && index === 0) ? 0 : -1}
                disabled={disabled}
                className={cx(
                  'axon-color-picker__swatch',
                  selected && 'axon-color-picker__swatch--selected',
                  prefersDarkText(swatch.value) && 'axon-color-picker__swatch--light',
                )}
                style={{ backgroundColor: swatch.value }}
                onClick={() => commit(swatch.value)}
                onKeyDown={handleSwatchKeyDown(index)}
              >
                <svg viewBox="0 0 16 16" className="axon-color-picker__check" aria-hidden="true">
                  <path d="M3.5 8.5 6.5 11.5 12.5 5" />
                </svg>
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        className={inputBoxClassName({
          size,
          variant: 'outline',
          color,
          error: error,
          disabled,
        })}
      >
        <span
          className="axon-color-picker__preview"
          aria-hidden="true"
          style={previewColor ? { backgroundColor: previewColor } : undefined}
        />
        <input
          ref={mergedRef}
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          placeholder="#000000"
          value={text}
          disabled={disabled}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          className="axon-input__field axon-color-picker__hex"
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitText();
          }}
        />
        {allowCustom ? (
          <input
            type="color"
            aria-label={customLabel}
            value={value ?? '#000000'}
            disabled={disabled}
            className="axon-color-picker__native"
            onChange={(event) => commit(normalizeHex(event.target.value))}
          />
        ) : null}
      </div>
      {name ? <input type="hidden" name={name} value={value ?? ''} disabled={disabled} /> : null}
    </Field>
  );
});
