import { constructFilterFn } from '@tanstack/react-table';
import { isBlank, searchText, toDate, toDateInputValue } from './format';

type Range = [unknown, unknown] | undefined | null;

const hasBound = (bound: unknown) => bound !== undefined && bound !== null && bound !== '';

function isEmptyRange(range: Range): boolean {
  return !Array.isArray(range) || (!hasBound(range[0]) && !hasBound(range[1]));
}

/** A text filter: the value contains what was typed, ignoring case. */
export const filterFn_gridText = /* @__PURE__ */ constructFilterFn({
  filter: (value, filterValue) =>
    searchText(value).includes(String(filterValue).trim().toLowerCase()),
  autoRemove: (filterValue) => isBlank(filterValue) || String(filterValue).trim() === '',
});

/** A select filter: the value, as text, is the chosen option. */
export const filterFn_gridSelect = /* @__PURE__ */ constructFilterFn({
  filter: (value, filterValue) => String(value ?? '') === String(filterValue),
  autoRemove: (filterValue) => isBlank(filterValue),
});

/** A number range `[min, max]`; either end can be left open. Rows without a number never match. */
export const filterFn_gridNumberRange = /* @__PURE__ */ constructFilterFn({
  filter: (value, filterValue: Range) => {
    if (isEmptyRange(filterValue)) return true;
    const number = typeof value === 'number' ? value : isBlank(value) ? Number.NaN : Number(value);
    if (Number.isNaN(number)) return false;
    const [min, max] = filterValue as [unknown, unknown];
    if (hasBound(min) && number < Number(min)) return false;
    if (hasBound(max) && number > Number(max)) return false;
    return true;
  },
  autoRemove: (filterValue) => isEmptyRange(filterValue),
});

/**
 * A date range `[from, to]` of `YYYY-MM-DD` days, both ends included; either can be left open.
 * Compared by calendar day in the local time zone, so a late-evening timestamp stays on its day.
 */
export const filterFn_gridDateRange = /* @__PURE__ */ constructFilterFn({
  filter: (value, filterValue: Range) => {
    if (isEmptyRange(filterValue)) return true;
    const date = toDate(value);
    if (!date) return false;
    const day = toDateInputValue(date);
    const [from, to] = filterValue as [unknown, unknown];
    if (hasBound(from) && day < String(from)) return false;
    if (hasBound(to) && day > String(to)) return false;
    return true;
  },
  autoRemove: (filterValue) => isEmptyRange(filterValue),
});

/** The toolbar search: a row matches when any searchable column contains the text. */
export const filterFn_gridSearch = /* @__PURE__ */ constructFilterFn({
  filter: (value, filterValue) =>
    searchText(value).includes(String(filterValue).trim().toLowerCase()),
  autoRemove: (filterValue) => isBlank(filterValue) || String(filterValue).trim() === '',
});
