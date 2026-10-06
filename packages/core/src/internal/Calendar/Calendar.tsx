import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import {
  addDays,
  addMonths,
  clampDate,
  compareDays,
  formatFullDate,
  formatMonthYear,
  getMonthMatrix,
  getWeekdayNames,
  isSameDay,
  startOfDay,
  toISODate,
} from '../date/date';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

export interface CalendarDayState {
  selected?: boolean;
  rangeStart?: boolean;
  rangeEnd?: boolean;
  inRange?: boolean;
}

export interface CalendarProps {
  /** Any date in the month to show. */
  month: Date;
  /** The date that holds the roving tab stop. */
  focusedDate: Date;
  onFocusDate: (date: Date, options?: { moveFocus?: boolean }) => void;
  onSelect: (date: Date) => void;
  getDayState?: (date: Date) => CalendarDayState;
  /** Dates that cannot be chosen (outside min/max or excluded). They stay focusable. */
  isDisabled?: (date: Date) => boolean;
  /** Keyboard navigation never moves focus outside this range. */
  min?: Date | null;
  max?: Date | null;
  onHoverDate?: (date: Date | null) => void;
  locale: string;
  /** 0 = Sunday ... 6 = Saturday. */
  firstDayOfWeek: number;
  /** Increment to move DOM focus to the focused date (after the calendar mounts or navigates). */
  focusRequest?: number;
  /** Showing a handler shows the matching month-navigation button. */
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  prevMonthLabel?: string;
  nextMonthLabel?: string;
  id: string;
  size?: AxonSize;
  color?: AxonColor;
  className?: string;
}

/**
 * A month grid following the WAI-ARIA date picker pattern: one tab stop, arrow keys move by day
 * and week, Home/End by week edge, PageUp/PageDown by month (Shift: year), Enter/Space select.
 */
export function Calendar({
  month,
  focusedDate,
  onFocusDate,
  onSelect,
  getDayState,
  isDisabled,
  min,
  max,
  onHoverDate,
  locale,
  firstDayOfWeek,
  focusRequest = 0,
  onPrevMonth,
  onNextMonth,
  prevMonthLabel = 'Previous month',
  nextMonthLabel = 'Next month',
  id,
  size = 'md',
  color = 'primary',
  className,
}: CalendarProps) {
  const titleId = `${id}-title`;
  const gridRef = useRef<HTMLTableElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const rows = useMemo(() => getMonthMatrix(month, firstDayOfWeek), [month, firstDayOfWeek]);
  const weekdays = useMemo(() => getWeekdayNames(locale, firstDayOfWeek), [locale, firstDayOfWeek]);

  useEffect(() => {
    if (focusRequest === 0) return;
    gridRef.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
  }, [focusRequest]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const offsetFromWeekStart = (focusedDate.getDay() - firstDayOfWeek + 7) % 7;
    let target: Date;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(focusedDate, -1);
        break;
      case 'ArrowRight':
        target = addDays(focusedDate, 1);
        break;
      case 'ArrowUp':
        target = addDays(focusedDate, -7);
        break;
      case 'ArrowDown':
        target = addDays(focusedDate, 7);
        break;
      case 'Home':
        target = addDays(focusedDate, -offsetFromWeekStart);
        break;
      case 'End':
        target = addDays(focusedDate, 6 - offsetFromWeekStart);
        break;
      case 'PageUp':
        target = addMonths(focusedDate, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        target = addMonths(focusedDate, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = clampDate(target, min, max);
    if (!isSameDay(next, focusedDate)) onFocusDate(next, { moveFocus: true });
  };

  return (
    <div
      className={cx(
        'axon-calendar',
        `axon-calendar--${size}`,
        `axon-calendar--${color}`,
        className,
      )}
    >
      <div className="axon-calendar__header">
        {onPrevMonth ? (
          <button
            type="button"
            className="axon-calendar__nav"
            aria-label={prevMonthLabel}
            onClick={onPrevMonth}
          >
            <ChevronLeftIcon />
          </button>
        ) : (
          <span className="axon-calendar__nav-spacer" />
        )}
        <div id={titleId} className="axon-calendar__title" aria-live="polite">
          {formatMonthYear(month, locale)}
        </div>
        {onNextMonth ? (
          <button
            type="button"
            className="axon-calendar__nav"
            aria-label={nextMonthLabel}
            onClick={onNextMonth}
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <span className="axon-calendar__nav-spacer" />
        )}
      </div>
      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={titleId}
        className="axon-calendar__grid"
        onKeyDown={handleKeyDown}
        onMouseLeave={() => onHoverDate?.(null)}
      >
        <thead>
          <tr>
            {weekdays.map((weekday) => (
              <th
                key={weekday.long}
                scope="col"
                abbr={weekday.long}
                className="axon-calendar__weekday"
              >
                {weekday.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((date, cellIndex) => {
                if (!date)
                  return <td key={cellIndex} role="gridcell" className="axon-calendar__cell" />;
                const state = getDayState?.(date) ?? {};
                const disabled = isDisabled?.(date) ?? false;
                const focused = isSameDay(date, focusedDate);
                const isToday = isSameDay(date, today);
                return (
                  <td
                    key={cellIndex}
                    role="gridcell"
                    aria-selected={state.selected || state.inRange ? true : undefined}
                    className={cx(
                      'axon-calendar__cell',
                      state.inRange && 'axon-calendar__cell--in-range',
                      state.rangeStart && 'axon-calendar__cell--range-start',
                      state.rangeEnd && 'axon-calendar__cell--range-end',
                    )}
                  >
                    <button
                      type="button"
                      tabIndex={focused ? 0 : -1}
                      data-date={toISODate(date)}
                      aria-label={formatFullDate(date, locale)}
                      aria-current={isToday ? 'date' : undefined}
                      aria-disabled={disabled || undefined}
                      className={cx(
                        'axon-calendar__day',
                        state.selected && 'axon-calendar__day--selected',
                        isToday && 'axon-calendar__day--today',
                        disabled && 'axon-calendar__day--disabled',
                      )}
                      onClick={() => {
                        if (!disabled) onSelect(date);
                      }}
                      onFocus={() => {
                        if (!focused) onFocusDate(date);
                      }}
                      onMouseEnter={() => onHoverDate?.(date)}
                    >
                      {date.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Whether `date` is outside `min`/`max`. */
export const isOutsideRange = (date: Date, min?: Date | null, max?: Date | null) =>
  Boolean((min && compareDays(date, min) < 0) || (max && compareDays(date, max) > 0));
