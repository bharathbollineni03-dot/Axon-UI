import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { ClockIcon, CloseIcon } from '../../internal/icons';
import {
  Field,
  inputBoxClassName,
  useFieldIds,
  type InputVariant,
} from '../../internal/Field/Field';
import { PopupDialog } from '../../internal/Popup/PopupDialog';
import {
  formatTime,
  getDayPeriodLabels,
  parseTimeString,
  parseTimeText,
  toMinutes,
  toTimeString,
  usesTwelveHourClock,
  type TimeParts,
} from '../../internal/date/time';
import { TimeColumn } from './TimeColumn';

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the text `<input>`;
 * other attributes go to the `<input>`.
 */
export interface TimePickerProps extends Omit<
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
  | 'step'
  | 'list'
> {
  /** A 24-hour `"HH:mm"` string, or `null` for none. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  /** Earliest and latest selectable times, as `"HH:mm"`. */
  min?: string;
  max?: string;
  /** Minutes between options in the minute column. Defaults to 5; typed times may be any minute. */
  minuteStep?: number;
  /** `12` shows AM/PM, `24` does not. Defaults to the locale's convention. */
  hourCycle?: 12 | 24;
  /** BCP 47 locale for formatting. Defaults to `en-US` so server and client render identically. */
  locale?: string;
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
  /** Submitted with forms as the 24-hour `"HH:mm"` string through a hidden input. */
  name?: string;
  openClockLabel?: string;
  nowLabel?: string;
  clearLabel?: string;
  hoursLabel?: string;
  minutesLabel?: string;
  periodLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_HOUR = 12;
const pad = (n: number) => String(n).padStart(2, '0');

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    min,
    max,
    minuteStep = 5,
    hourCycle: hourCycleProp,
    locale = 'en-US',
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
    openClockLabel = 'Choose time',
    nowLabel = 'Now',
    clearLabel = 'Clear',
    hoursLabel = 'Hours',
    minutesLabel = 'Minutes',
    periodLabel = 'AM/PM',
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

  const twelveHour = hourCycleProp ? hourCycleProp === 12 : usesTwelveHourClock(locale);
  const periods = useMemo(() => getDayPeriodLabels(locale), [locale]);
  const minParts = parseTimeString(min);
  const maxParts = parseTimeString(max);

  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
  });
  const parts = parseTimeString(value);
  const format = (time: string | null) => {
    const p = parseTimeString(time);
    return p ? formatTime(p, locale, twelveHour) : '';
  };
  const [text, setText] = useState(() => format(value));

  const lastSeen = useRef(value);
  useIsomorphicLayoutEffect(() => {
    if (value === lastSeen.current) return;
    lastSeen.current = value;
    setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [open, setOpen] = useState(false);

  const isAllowed = (time: TimeParts) => {
    const minutes = toMinutes(time);
    return (
      (!minParts || minutes >= toMinutes(minParts)) && (!maxParts || minutes <= toMinutes(maxParts))
    );
  };

  const commit = (time: TimeParts | null) => {
    const next = time ? toTimeString(time) : null;
    if (next !== value) {
      setValue(next);
      onChange?.(next);
    }
    setText(format(value));
  };

  const commitText = () => {
    if (readOnly) return;
    const parsed = parseTimeText(text);
    if (text.trim() === '') commit(null);
    else if (parsed && isAllowed(parsed)) commit(parsed);
    else setText(format(value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Enter') {
      commitText();
    }
  };

  // --- column options -------------------------------------------------------------------
  const currentHour = parts?.hour ?? DEFAULT_HOUR;
  const isPm = currentHour >= 12;
  const hourValues = twelveHour
    ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)) // 12, 1, 2 ... 11
    : Array.from({ length: 24 }, (_, i) => i);
  const to24 = (hour: number) => (twelveHour ? (hour % 12) + (isPm ? 12 : 0) : hour);

  const hourOptions = hourValues.map((hour) => {
    const h24 = to24(hour);
    const anyMinuteAllowed = Array.from({ length: 60 }, (_, minute) => minute).some((minute) =>
      isAllowed({ hour: h24, minute }),
    );
    return {
      value: String(hour),
      label: twelveHour ? String(hour) : pad(hour),
      disabled: !anyMinuteAllowed,
    };
  });
  const minuteOptions = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep)
    .concat(parts && parts.minute % minuteStep !== 0 ? [parts.minute] : [])
    .sort((a, b) => a - b)
    .map((minute) => ({
      value: String(minute),
      label: pad(minute),
      disabled: !isAllowed({ hour: currentHour, minute }),
    }));
  const periodOptions = [
    { value: 'AM', label: periods[0] },
    { value: 'PM', label: periods[1] },
  ];

  const selectHour = (hourValue: string) =>
    commit({ hour: to24(Number(hourValue)), minute: parts?.minute ?? 0 });
  const selectMinute = (minuteValue: string) =>
    commit({ hour: currentHour, minute: Number(minuteValue) });
  const selectPeriod = (period: string) =>
    commit({ hour: (currentHour % 12) + (period === 'PM' ? 12 : 0), minute: parts?.minute ?? 0 });

  const message = error && errorMessage ? errorMessage : helperText;
  const canClear = clearable && text !== '' && !disabled && !readOnly;
  const selectedHour = parts ? String(twelveHour ? parts.hour % 12 || 12 : parts.hour) : null;
  const now = () => {
    const date = new Date();
    const time = { hour: date.getHours(), minute: date.getMinutes() };
    commit(isAllowed(time) ? time : null);
  };

  return (
    <Field
      baseClass="axon-time-picker"
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
          placeholder={placeholder ?? (twelveHour ? 'h:mm AM' : 'HH:mm')}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(ariaDescribedBy, Boolean(message) && messageId)}
          className="axon-input__field"
          onChange={(event) => setText(event.target.value)}
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
          aria-label={openClockLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled || readOnly}
          onClick={() => setOpen((current) => !current)}
        >
          <ClockIcon />
        </button>
      </div>
      {name ? <input type="hidden" name={name} value={value ?? ''} disabled={disabled} /> : null}
      <PopupDialog
        open={open}
        reference={boxElement}
        onClose={() => setOpen(false)}
        label={typeof label === 'string' ? label : openClockLabel}
        size={size}
        color={color}
      >
        <div className={cx('axon-time-list', `axon-time-list--${color}`)}>
          <TimeColumn
            id={`${id}-hours`}
            label={hoursLabel}
            options={hourOptions}
            selected={selectedHour}
            onSelect={selectHour}
            onConfirm={() => setOpen(false)}
            focusOnMount
          />
          <TimeColumn
            id={`${id}-minutes`}
            label={minutesLabel}
            options={minuteOptions}
            selected={parts ? String(parts.minute) : null}
            onSelect={selectMinute}
            onConfirm={() => setOpen(false)}
          />
          {twelveHour ? (
            <TimeColumn
              id={`${id}-period`}
              label={periodLabel}
              options={periodOptions}
              selected={parts ? (isPm ? 'PM' : 'AM') : null}
              onSelect={selectPeriod}
              onConfirm={() => setOpen(false)}
            />
          ) : null}
        </div>
        <div className="axon-popup__footer">
          <button type="button" className="axon-popup__action" onClick={now}>
            {nowLabel}
          </button>
          {value ? (
            <button
              type="button"
              className="axon-popup__action"
              onClick={() => {
                commit(null);
                setOpen(false);
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
