import { constructSortFn } from '@tanstack/react-table';
import { isBlank } from './format';

/**
 * Sorts by numeric value, reading numbers that arrive as text ("9", "10", "100") as numbers. What
 * is not a number goes after every number in ascending order.
 */
export const sortFn_gridNumber = /* @__PURE__ */ constructSortFn({
  resolveDataValue: (value) =>
    typeof value === 'number' ? value : isBlank(value) ? Number.NaN : Number(value),
  sort: (a: number, b: number) => {
    const aMissing = Number.isNaN(a);
    const bMissing = Number.isNaN(b);
    if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
    return a < b ? -1 : a > b ? 1 : 0;
  },
});
