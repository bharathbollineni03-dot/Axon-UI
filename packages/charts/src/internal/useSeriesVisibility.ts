import { useCallback, useMemo } from 'react';
import { useControllableState } from '@axon/core';
import { resolveSeries, type ResolvedSeries, type SeriesInput } from './palette';

export interface SeriesVisibilityOptions {
  hiddenSeries?: readonly string[];
  defaultHiddenSeries?: readonly string[];
  onHiddenSeriesChange?: (hidden: string[]) => void;
}

export interface SeriesVisibility<T extends SeriesInput> {
  /** Every series, with its name and color filled in, hidden or not. */
  all: (T & ResolvedSeries)[];
  /** The series that are showing. */
  visible: (T & ResolvedSeries)[];
  hidden: string[];
  isHidden: (key: string) => boolean;
  /** Switches one series on or off. */
  toggle: (key: string) => void;
}

/**
 * Which series a legend has switched off: controlled with `hiddenSeries`, or kept here. Colors
 * come from a series' place in the full list, so hiding one never recolors the others.
 */
export function useSeriesVisibility<T extends SeriesInput>(
  series: readonly T[],
  { hiddenSeries, defaultHiddenSeries, onHiddenSeriesChange }: SeriesVisibilityOptions,
): SeriesVisibility<T> {
  const [hidden, setHidden] = useControllableState<string[]>({
    value: hiddenSeries ? [...hiddenSeries] : undefined,
    defaultValue: defaultHiddenSeries ? [...defaultHiddenSeries] : [],
    onChange: onHiddenSeriesChange,
  });
  const all = useMemo(() => resolveSeries(series), [series]);
  const visible = useMemo(() => all.filter((item) => !hidden.includes(item.key)), [all, hidden]);
  const toggle = useCallback(
    (key: string) =>
      setHidden((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
      ),
    [setHidden],
  );
  return { all, visible, hidden, isHidden: (key) => hidden.includes(key), toggle };
}
