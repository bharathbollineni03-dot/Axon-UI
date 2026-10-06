import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useControllableState } from '../../hooks/useControllableState';
import { CalendarIcon, CloseIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';
import { Calendar, isOutsideRange } from '../../internal/Calendar/Calendar';
import { PopupDialog } from '../../internal/Popup/PopupDialog';
import {
  addMonths,
  clampDate,
  formatDate,
  getDatePlaceholder,
  getFirstDayOfWeek,
  isSameDay,
  parseDate,
  startOfDay,
  startOfMonth,
  toISODate,
} from '../../internal/date/date';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the text `<input>`;
 * other attributes (placeholder, autoComplete, aria-*, onFocus, ...) go to the `<input>`.
 */
export interface DatePickerProps extends Omit<
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
  | 'name'
  | 'list'
> {
  /** The chosen date (local time of day is ignored), or `null` for none. */
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  /** Earliest and latest selectable dates (inclusive). */
  min?: Date;
  max?: Date;
  /** Marks extra dates unselectable, e.g. weekends or booked days. */
  isDateDisabled?: (date: Date) => boolean;
  /**
   * BCP 47 locale for formatting, parsing and the calendar. Defaults to `en-US` so server and
   * client render identically; pass `navigator.language` to follow the user.
   */
  locale?: string;
  /** 0 = Sunday ... 6 = Saturday. Defaults to the locale's first day when the runtime knows it. */
  firstDayOfWeek?: number;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  variant?: InputVariant;
  color?: AxonColor;
  fullWidth?: boolean;
  clearable?: boolean;
  /** Submitted with forms as an ISO `yyyy-mm-dd` string through a hidden input. */
  name?: string;
  openCalendarLabel?: string;
  todayLabel?: string;
  clearLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    min,
    max,
    isDateDisabled,
    locale = 'en-US',
    firstDayOfWeek: firstDayProp,
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    variant = 'outline',
    color = 'primary',
    fullWidth = false,
    clearable = false,
    name,
    openCalendarLabel = 'Choose date',
    todayLabel = 'Today',
    clearLabel = 'Clear',
    id: idProp,
    disabled = false,
    readOnly = false,
    required = false,
    placeholder,
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(ref, inputRef);
  const [boxElement, setBoxElement] = useState<HTMLDivElement | null>(null);

  const firstDayOfWeek = firstDayProp ?? getFirstDayOfWeek(locale);
  const format = (date: Date | null) => (date ? formatDate(date, locale) : '');

  const [value, setValue] = useControllableState<Date | null>({
    value: valueProp,
    defaultValue,
  });
  const [text, setText] = useState(() => format(value));

  // Show the committed date in the input whenever it changes: by a controlled parent, a reset,
  // or our own commit (uncontrolled).
  const lastSeen = useRef(value);
  useIsomorphicLayoutEffect(() => {
    if (Boolean(value) === Boolean(lastSeen.current) && isSameDay(value, lastSeen.current)) return;
    lastSeen.current = value;
    setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [open, setOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState(() => value ?? startOfDay(new Date()));
  const [focusRequest, setFocusRequest] = useState(0);

  const isDisabled = (date: Date) =>
    isOutsideRange(date, min, max) || (isDateDisabled?.(date) ?? false);

  const commit = (date: Date | null) => {
    const day = date && startOfDay(date);
    if (!(Boolean(day) === Boolean(value) && isSameDay(day, value))) {
      setValue(day);
      onChange?.(day);
    }
    // Until the new value arrives (or if a controlled parent refuses it) show the current one.
    setText(format(value));
  };

  const commitText = () => {
    if (readOnly) return;
    const parsed = parseDate(text, locale);
    if (text.trim() === '') commit(null);
    else if (parsed && !isDisabled(parsed)) commit(parsed);
    else setText(format(value)); // not a usable date: go back to the last good value
  };

  const openCalendar = () => {
    if (disabled || readOnly) return;
    setFocusedDate(clampDate(value ?? startOfDay(new Date()), min, max));
    setFocusRequest((n) => n + 1);
    setOpen(true);
  };

  const closeCalendar = () => setOpen(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault();
      openCalendar();
    } else if (event.key === 'Enter') {
      commitText();
    }
  };

  const message = error && errorMessage ? errorMessage : helperText;
  const pattern = useMemo(() => getDatePlaceholder(locale), [locale]);
  const today = startOfDay(new Date());
  const canClear = clearable && text !== '' && !disabled && !readOnly;
  const dialogLabel = typeof label === 'string' ? label : openCalendarLabel;

  return (
    <Field
      baseClass="axon-date-picker"
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
      <div
        ref={setBoxElement}
        className={inputBoxClassName({ size, variant, color, error, disabled, readOnly })}
      >
        <input
          autoComplete="off"
          {...inputProps}
          ref={mergedRef}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder ?? pattern}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          className="axon-input__field"
          onChange={(event: ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            commitText();
            onBlur?.(event);
          }}
        />
        {canClear ? (
          <button
            type="button"
            className="axon-input__action"
            aria-label={clearLabel}
            onClick={() => {
              commit(null);
              inputRef.current?.focus();
            }}
          >
            <CloseIcon />
          </button>
        ) : null}
        <button
          type="button"
          className="axon-input__action"
          aria-label={openCalendarLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled || readOnly}
          onClick={() => (open ? closeCalendar() : openCalendar())}
        >
          <CalendarIcon />
        </button>
      </div>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value ? toISODate(value) : ''}
          disabled={disabled}
        />
      ) : null}
      <PopupDialog
        open={open}
        reference={boxElement}
        onClose={closeCalendar}
        label={dialogLabel}
        size={size}
        color={color}
      >
        <Calendar
          id={`${id}-calendar`}
          month={startOfMonth(focusedDate)}
          focusedDate={focusedDate}
          onFocusDate={(date, options) => {
            setFocusedDate(date);
            if (options?.moveFocus) setFocusRequest((n) => n + 1);
          }}
          focusRequest={focusRequest}
          onSelect={(date) => {
            commit(date);
            closeCalendar();
          }}
          getDayState={(date) => ({ selected: isSameDay(date, value) })}
          isDisabled={isDisabled}
          min={min}
          max={max}
          locale={locale}
          firstDayOfWeek={firstDayOfWeek}
          onPrevMonth={() => setFocusedDate(clampDate(addMonths(focusedDate, -1), min, max))}
          onNextMonth={() => setFocusedDate(clampDate(addMonths(focusedDate, 1), min, max))}
          size={size}
          color={color}
        />
        <div className="axon-popup__footer">
          <button
            type="button"
            className="axon-popup__action"
            disabled={isDisabled(today)}
            onClick={() => {
              commit(today);
              closeCalendar();
            }}
          >
            {todayLabel}
          </button>
          {value ? (
            <button
              type="button"
              className="axon-popup__action"
              onClick={() => {
                commit(null);
                closeCalendar();
              }}
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      </PopupDialog>
    </Field>
  );
});
