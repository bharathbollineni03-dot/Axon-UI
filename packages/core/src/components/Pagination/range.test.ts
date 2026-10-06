import { describe, expect, it } from 'vitest';
import { getPaginationRange } from './range';

const E1 = 'start-ellipsis';
const E2 = 'end-ellipsis';

describe('getPaginationRange', () => {
  it('lists every page when they all fit', () => {
    expect(getPaginationRange({ page: 1, count: 1 })).toEqual([1]);
    expect(getPaginationRange({ page: 2, count: 3 })).toEqual([1, 2, 3]);
    expect(getPaginationRange({ page: 3, count: 7 })).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('is empty for no pages', () => {
    expect(getPaginationRange({ page: 1, count: 0 })).toEqual([]);
  });

  it('collapses the end behind an ellipsis near the start', () => {
    expect(getPaginationRange({ page: 1, count: 10 })).toEqual([1, 2, 3, 4, 5, E2, 10]);
    expect(getPaginationRange({ page: 3, count: 10 })).toEqual([1, 2, 3, 4, 5, E2, 10]);
  });

  it('collapses both sides in the middle', () => {
    expect(getPaginationRange({ page: 5, count: 10 })).toEqual([1, E1, 4, 5, 6, E2, 10]);
    expect(getPaginationRange({ page: 6, count: 10 })).toEqual([1, E1, 5, 6, 7, E2, 10]);
  });

  it('collapses the start behind an ellipsis near the end', () => {
    expect(getPaginationRange({ page: 10, count: 10 })).toEqual([1, E1, 6, 7, 8, 9, 10]);
    expect(getPaginationRange({ page: 8, count: 10 })).toEqual([1, E1, 6, 7, 8, 9, 10]);
  });

  it('keeps the same number of items while paging, so the control does not jump', () => {
    const lengths = new Set(
      Array.from({ length: 20 }, (_, i) => getPaginationRange({ page: i + 1, count: 20 }).length),
    );
    expect(lengths).toEqual(new Set([7]));
  });

  it('replaces an ellipsis that would hide a single page with that page', () => {
    // page 4 of 10: pages 1 | 2 3 4 5 | ... | 10 would hide only page 2 on the left
    expect(getPaginationRange({ page: 4, count: 10 })).toEqual([1, 2, 3, 4, 5, E2, 10]);
    expect(getPaginationRange({ page: 7, count: 10 })).toEqual([1, E1, 6, 7, 8, 9, 10]);
  });

  it('honours siblingCount', () => {
    expect(getPaginationRange({ page: 10, count: 20, siblingCount: 2 })).toEqual([
      1,
      E1,
      8,
      9,
      10,
      11,
      12,
      E2,
      20,
    ]);
    expect(getPaginationRange({ page: 10, count: 20, siblingCount: 0 })).toEqual([
      1,
      E1,
      10,
      E2,
      20,
    ]);
  });

  it('honours boundaryCount', () => {
    expect(getPaginationRange({ page: 10, count: 20, boundaryCount: 2 })).toEqual([
      1,
      2,
      E1,
      9,
      10,
      11,
      E2,
      19,
      20,
    ]);
  });

  it('never repeats a page and stays in ascending order', () => {
    for (const count of [1, 2, 5, 9, 10, 25]) {
      for (let page = 1; page <= count; page += 1) {
        for (const siblingCount of [0, 1, 2]) {
          for (const boundaryCount of [1, 2]) {
            const numbers = getPaginationRange({ page, count, siblingCount, boundaryCount }).filter(
              (item): item is number => typeof item === 'number',
            );
            expect(new Set(numbers).size).toBe(numbers.length);
            expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
            expect(numbers).toContain(page);
            expect(numbers[0]).toBe(1);
            expect(numbers[numbers.length - 1]).toBe(count);
          }
        }
      }
    }
  });
});
