import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the `<textarea>`;
 * every other prop goes to the `<textarea>` itself.
 */
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'color'> {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  color?: AxonColor;
  fullWidth?: boolean;
  /** Grows with its content between `minRows` and `maxRows`. */
  autoResize?: boolean;
  /** Rows shown when empty (and the lower bound while auto-resizing). Defaults to 3. */
  minRows?: number;
  /** Upper bound while auto-resizing; the textarea scrolls beyond it. */
  maxRows?: number;
  /** Shows a character counter (`n` or `n / maxLength`). */
  showCount?: boolean;
  className?: string;
  style?: CSSProperties;
}

function fitHeight(element: HTMLTextAreaElement, minRows: number, maxRows?: number) {
  const styles = window.getComputedStyle(element);
  const fontSize = parseFloat(styles.fontSize) || 16;
  const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.5;
  const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) || 0;
  const border = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth) || 0;

  element.style.height = 'auto';
  const contentHeight = element.scrollHeight + border;
  const min = lineHeight * minRows + padding + border;
  const max = maxRows !== undefined ? lineHeight * maxRows + padding + border : Infinity;

  element.style.height = `${Math.min(Math.max(contentHeight, min), max)}px`;
  element.style.overflowY = contentHeight > max ? 'auto' : 'hidden';
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    autoResize = false,
    minRows = 3,
    maxRows,
    showCount = false,
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
    ...textareaProps
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mergedRef = useMergedRef(ref, textareaRef);

  const isControlled = value !== undefined;
  const [uncontrolledLength, setUncontrolledLength] = useState(
    () => String(defaultValue ?? '').length,
  );
  const length = isControlled ? String(value).length : uncontrolledLength;

  const resize = useCallback(() => {
    if (autoResize && textareaRef.current) fitHeight(textareaRef.current, minRows, maxRows);
  }, [autoResize, minRows, maxRows]);

  // Re-fit when the content (controlled or not) or the sizing options change.
  useIsomorphicLayoutEffect(resize, [resize, value, length]);

  // Wrapping changes with the width, so re-fit when the element is resized horizontally.
  useEffect(() => {
    const element = textareaRef.current;
    if (!autoResize || !element || typeof ResizeObserver === 'undefined') return;
    let width = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth !== width) {
        width = element.offsetWidth;
        resize();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoResize, resize]);

  const message = error && errorMessage ? errorMessage : helperText;
  const counter = showCount
    ? `${length}${textareaProps.maxLength !== undefined ? ` / ${textareaProps.maxLength}` : ''}`
    : undefined;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setUncontrolledLength(event.target.value.length);
    onChange?.(event);
  };

  const handleBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('textarea') || disabled) return;
    event.preventDefault();
    textareaRef.current?.focus();
  };

  return (
    <Field
      baseClass="axon-text-area"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth={fullWidth}
      message={message}
      counter={counter}
      className={className}
      style={style}
    >
      {/* The mouse handler only forwards clicks to the textarea, which stays the focus target. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={inputBoxClassName({
          size,
          variant,
          color,
          error,
          disabled,
          readOnly,
          className: 'axon-input--multiline',
        })}
        onMouseDown={handleBoxMouseDown}
      >
        <textarea
          {...textareaProps}
          ref={mergedRef}
          id={id}
          rows={autoResize ? minRows : (textareaProps.rows ?? minRows)}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            Boolean(message) && messageId,
            showCount && counterId,
          )}
          className={
            autoResize ? 'axon-input__field axon-input__field--auto-resize' : 'axon-input__field'
          }
        />
      </div>
    </Field>
  );
});
