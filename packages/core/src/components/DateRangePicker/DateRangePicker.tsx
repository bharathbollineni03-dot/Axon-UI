import {
  forwardRef,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
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
  compareDays,
  formatDate,
  getDatePlaceholder,
  getFirstDayOfWeek,
  isSameDay,
  parseDate,
  startOfDay,
  startOfMonth,
  toISODate,
} from '../../internal/date/date';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the start `<input>`.
 */
export interface DateRangePickerProps extends Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'autoFocus' | 'onFocus' | 'onBlur'
> {
  /** The chosen range. Either end may be `null` while a range is being picked. */
  value?: DateRange;
  defaultValue?: DateRange;
  /** Called on every change, including when only the start has been picked. */
  onChange?: (range: DateRange) => void;
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  /** BCP 47 locale for formatting, parsing and the calendars. Defaults to `en-US` (SSR safe). */
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
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Names of the hidden inputs that submit the range as ISO `yyyy-mm-dd` strings. */
  startName?: string;
  endName?: string;
  id?: string;
  startLabel?: string;
  endLabel?: string;
  openCalendarLabel?: string;
  clearLabel?: string;
  className?: string;
  style?: CSSProperties;
  'aria-describedby'?: string;
}

const EMPTY_RANGE: DateRange = { start: null, end: null };

const sameDate = (a: Date | null, b: Date | null) =>
  Boolean(a) === Boolean(b) && (a === null || isSameDay(a, b));

const sameRange = (a: DateRange, b: DateRange) =>
  sameDate(a.start, b.start) && sameDate(a.end, b.end);

/** Two date inputs and a two-month calendar for choosing a start and an end date. */
export const DateRangePicker = forwardRef<HTMLInputElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value: valueProp,
      defaultValue = EMPTY_RANGE,
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
      disabled = false,
      readOnly = false,
      required = false,
      startName,
      endName,
      id: idProp,
      startLabel = 'Start date',
      endLabel = 'End date',
      openCalendarLabel = 'Choose date range',
      clearLabel = 'Clear',
      className,
      style,
      onBlur,
      'aria-describedby': ariaDescribedBy,
      ...inputProps
    },
    ref,
  ) {
    const { id, messageId, counterId } = useFieldIds(idProp);
    const startRef = useRef<HTMLInputElement | null>(null);
    const mergedStartRef = useMergedRef(ref, startRef);
    const [boxElement, setBoxElement] = useState<HTMLDivElement | null>(null);

    const firstDayOfWeek = firstDayProp ?? getFirstDayOfWeek(locale);
    const format = (date: Date | null) => (date ? formatDate(date, locale) : '');

    const [range, setRange] = useControllableState<DateRange>({
      value: valueProp,
      defaultValue,
    });
    const [startText, setStartText] = useState(() => format(range.start));
    const [endText, setEndText] = useState(() => format(range.end));

    const lastSeen = useRef(range);
    useIsomorphicLayoutEffect(() => {
      if (sameRange(range, lastSeen.current)) return;
      lastSeen.current = range;
      setStartText(format(range.start));
      setEndText(format(range.end));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]);

    const [open, setOpen] = useState(false);
    const [focusedDate, setFocusedDate] = useState(() => range.start ?? startOfDay(new Date()));
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(range.start ?? new Date()));
    const [focusRequest, setFocusRequest] = useState(0);
    // While picking: the first click has set the start and we are waiting for the end.
    const [selecting, setSelecting] = useState(false);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const isDisabled = (date: Date) =>
      isOutsideRange(date, min, max) || (isDateDisabled?.(date) ?? false);

    const commit = (next: DateRange) => {
      const normalized = {
        start: next.start && startOfDay(next.start),
        end: next.end && startOfDay(next.end),
      };
      if (!sameRange(normalized, range)) {
        setRange(normalized);
        onChange?.(normalized);
      }
      setStartText(format(range.start));
      setEndText(format(range.end));
    };

    const commitStartText = () => {
      if (readOnly) return;
      const parsed = parseDate(startText, locale);
      if (startText.trim() === '') commit({ start: null, end: range.end });
      else if (parsed && !isDisabled(parsed)) {
        // A start after the current end drops the end so the range stays ordered.
        const end = range.end && compareDays(parsed, range.end) > 0 ? null : range.end;
        commit({ start: parsed, end });
      } else setStartText(format(range.start));
    };

    const commitEndText = () => {
      if (readOnly) return;
      const parsed = parseDate(endText, locale);
      if (endText.trim() === '') commit({ start: range.start, end: null });
      else if (
        parsed &&
        !isDisabled(parsed) &&
        (!range.start || compareDays(parsed, range.start) >= 0)
      ) {
        commit({ start: range.start, end: parsed });
      } else setEndText(format(range.end));
    };

    const focusDate = (date: Date) => {
      setFocusedDate(date);
      if (compareDays(date, viewMonth) < 0) setViewMonth(startOfMonth(date));
      else if (compareDays(date, startOfMonth(addMonths(viewMonth, 2))) >= 0) {
        setViewMonth(startOfMonth(addMonths(date, -1)));
      }
    };

    const openCalendar = () => {
      if (disabled || readOnly) return;
      const initial = clampDate(range.start ?? startOfDay(new Date()), min, max);
      setFocusedDate(initial);
      setViewMonth(startOfMonth(initial));
      setSelecting(false);
      setHoverDate(null);
      setFocusRequest((n) => n + 1);
      setOpen(true);
    };

    const closeCalendar = () => {
      setOpen(false);
      setSelecting(false);
      setHoverDate(null);
    };

    const selectDate = (date: Date) => {
      if (!selecting || !range.start) {
        commit({ start: date, end: null });
        setSelecting(true);
        return;
      }
      const [start, end] =
        compareDays(date, range.start) < 0 ? [date, range.start] : [range.start, date];
      commit({ start, end });
      closeCalendar();
    };

    const handleKeyDown = (commitText: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.defaultPrevented || disabled || readOnly) return;
      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault();
        openCalendar();
      } else if (event.key === 'Enter') {
        commitText();
      }
    };

    const getDayState = (date: Date) => {
      const anchor = selecting && hoverDate && range.start ? range.start : null;
      const [start, end] = anchor
        ? compareDays(hoverDate!, anchor) < 0
          ? [hoverDate!, anchor]
          : [anchor, hoverDate!]
        : [range.start, range.end];
      const isStart = Boolean(start && isSameDay(date, start));
      const isEnd = Boolean(end && isSameDay(date, end));
      return {
        selected: isStart || isEnd,
        rangeStart: isStart && Boolean(end),
        rangeEnd: isEnd && Boolean(start),
        inRange:
          Boolean(start && end) && compareDays(date, start!) > 0 && compareDays(date, end!) < 0,
      };
    };

    const message = error && errorMessage ? errorMessage : helperText;
    const pattern = getDatePlaceholder(locale);
    const hasValue = Boolean(range.start || range.end);
    const canClear = clearable && hasValue && !disabled && !readOnly;
    const commonInputProps = {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      autoComplete: 'off',
      placeholder: pattern,
      disabled,
      readOnly,
      'aria-invalid': error || undefined,
      className: 'axon-input__field axon-date-range-picker__input',
    };

    return (
      <Field
        baseClass="axon-date-range-picker"
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
          role="group"
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : openCalendarLabel}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          className={inputBoxClassName({ size, variant, color, error, disabled, readOnly })}
        >
          <input
            {...inputProps}
            {...commonInputProps}
            ref={mergedStartRef}
            id={id}
            aria-label={startLabel}
            required={required}
            value={startText}
            onChange={(event) => setStartText(event.target.value)}
            onKeyDown={handleKeyDown(commitStartText)}
            onBlur={(event: FocusEvent<HTMLInputElement>) => {
              commitStartText();
              onBlur?.(event);
            }}
          />
          <span className="axon-date-range-picker__separator" aria-hidden="true">
            –
          </span>
          <input
            {...commonInputProps}
            id={`${id}-end`}
            aria-label={endLabel}
            value={endText}
            onChange={(event) => setEndText(event.target.value)}
            onKeyDown={handleKeyDown(commitEndText)}
            onBlur={commitEndText}
          />
          {canClear ? (
            <button
              type="button"
              className="axon-input__action"
              aria-label={clearLabel}
              onClick={() => {
                commit(EMPTY_RANGE);
                startRef.current?.focus();
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
        {startName ? (
          <input
            type="hidden"
            name={startName}
            value={range.start ? toISODate(range.start) : ''}
            disabled={disabled}
          />
        ) : null}
        {endName ? (
          <input
            type="hidden"
            name={endName}
            value={range.end ? toISODate(range.end) : ''}
            disabled={disabled}
          />
        ) : null}
        <PopupDialog
          open={open}
          reference={boxElement}
          onClose={closeCalendar}
          label={openCalendarLabel}
          size={size}
          color={color}
        >
          <div className="axon-date-range-picker__months">
            {[0, 1].map((offset) => (
              <Calendar
                key={offset}
                id={`${id}-calendar-${offset}`}
                month={addMonths(viewMonth, offset)}
                focusedDate={focusedDate}
                onFocusDate={(date, options) => {
                  focusDate(date);
                  if (options?.moveFocus) setFocusRequest((n) => n + 1);
                }}
                focusRequest={focusRequest}
                onSelect={selectDate}
                getDayState={getDayState}
                isDisabled={isDisabled}
                min={min}
                max={max}
                onHoverDate={setHoverDate}
                locale={locale}
                firstDayOfWeek={firstDayOfWeek}
                onPrevMonth={
                  offset === 0 ? () => setViewMonth(addMonths(viewMonth, -1)) : undefined
                }
                onNextMonth={offset === 1 ? () => setViewMonth(addMonths(viewMonth, 1)) : undefined}
                size={size}
                color={color}
              />
            ))}
          </div>
          {hasValue ? (
            <div className="axon-popup__footer">
              <span />
              <button
                type="button"
                className="axon-popup__action"
                onClick={() => {
                  commit(EMPTY_RANGE);
                  closeCalendar();
                }}
              >
                {clearLabel}
              </button>
            </div>
          ) : null}
        </PopupDialog>
      </Field>
    );
  },
);
