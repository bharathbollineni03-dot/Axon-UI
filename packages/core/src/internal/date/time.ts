/** Time helpers. Times are `"HH:mm"` strings in 24-hour form, so they serialize and compare easily. */

export interface TimeParts {
  hour: number;
  minute: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const isValidTimeString = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function parseTimeString(value: string | null | undefined): TimeParts | null {
  if (!value || !isValidTimeString(value)) return null;
  return { hour: Number(value.slice(0, 2)), minute: Number(value.slice(3, 5)) };
}

export const toTimeString = ({ hour, minute }: TimeParts) => `${pad(hour)}:${pad(minute)}`;

export const toMinutes = ({ hour, minute }: TimeParts) => hour * 60 + minute;

/** Whether the locale shows a 12-hour clock (with AM/PM) by default. */
export function usesTwelveHourClock(locale: string): boolean {
  try {
    const { hourCycle } = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    return hourCycle === 'h11' || hourCycle === 'h12';
  } catch {
    return false;
  }
}

export function formatTime(parts: TimeParts, locale: string, twelveHour: boolean): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: twelveHour,
  }).format(new Date(2000, 0, 1, parts.hour, parts.minute));
}

/** The AM and PM strings a locale uses, e.g. `["AM", "PM"]` or `["上午", "下午"]`. */
export function getDayPeriodLabels(locale: string): [string, string] {
  const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true });
  const period = (hour: number) =>
    formatter.formatToParts(new Date(2000, 0, 1, hour)).find((p) => p.type === 'dayPeriod')
      ?.value ?? (hour < 12 ? 'AM' : 'PM');
  return [period(9), period(15)];
}

/**
 * Parses typed times such as `15:30`, `3:30 PM`, `3pm`, `1530` or `9`. A trailing am/pm
 * (also `a.m.`) switches to 12-hour interpretation. Returns `null` for anything else.
 */
export function parseTimeText(text: string): TimeParts | null {
  const match = /^\s*(\d{1,2})(?:[:.]?(\d{2}))?\s*(?:([ap])\.?\s*m?\.?)?\s*$/i.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const period = match[3]?.toLowerCase();
  if (minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === 'p' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return { hour, minute };
}
