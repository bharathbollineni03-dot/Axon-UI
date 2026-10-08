import { describe, expect, it } from 'vitest';
import {
  computeDomain,
  createXScale,
  createYScale,
  inferXKind,
  nearestIndex,
  thinCategories,
  uniqueCategories,
} from './scales';

describe('computeDomain', () => {
  it('spans the lowest and highest value', () => {
    expect(computeDomain([3, 9, 1, 7])).toEqual([1, 9]);
  });

  it('ignores missing and non-finite values', () => {
    expect(computeDomain([4, null, undefined, NaN, Infinity, 10])).toEqual([4, 10]);
  });

  it('can be made to include zero', () => {
    expect(computeDomain([5, 9], { includeZero: true })).toEqual([0, 9]);
    expect(computeDomain([-5, -2], { includeZero: true })).toEqual([-5, 0]);
    expect(computeDomain([-5, 4], { includeZero: true })).toEqual([-5, 4]);
  });

  it('can be fixed at either end', () => {
    expect(computeDomain([5, 9], { min: 0 })).toEqual([0, 9]);
    expect(computeDomain([5, 9], { max: 100 })).toEqual([5, 100]);
    expect(computeDomain([5, 9], { min: 1, max: 10 })).toEqual([1, 10]);
  });

  it('never gives an empty domain', () => {
    expect(computeDomain([])).toEqual([0, 1]);
    expect(computeDomain([null, undefined])).toEqual([0, 1]);
    expect(computeDomain([0, 0])).toEqual([0, 1]);
  });

  it('widens equal values so a scale can draw them', () => {
    const [low, high] = computeDomain([50, 50]);
    expect(low).toBeLessThan(50);
    expect(high).toBeGreaterThan(50);
    const [lowNeg, highNeg] = computeDomain([-20, -20]);
    expect(lowNeg).toBeLessThan(-20);
    expect(highNeg).toBeGreaterThan(-20);
  });

  it('puts a reversed fixed range the right way round', () => {
    expect(computeDomain([1, 2], { min: 10, max: 0 })).toEqual([0, 10]);
  });

  it('handles a very large number of values', () => {
    const values = Array.from({ length: 200_000 }, (_, i) => i);
    expect(computeDomain(values)).toEqual([0, 199_999]);
  });
});

describe('createYScale', () => {
  it('maps the domain onto the range, with the low value at the first end', () => {
    const scale = createYScale({ domain: [0, 100], range: [200, 0], nice: false });
    expect(scale.position(0)).toBe(200);
    expect(scale.position(100)).toBe(0);
    expect(scale.position(25)).toBe(150);
  });

  it('inverts a position back to a value', () => {
    const scale = createYScale({ domain: [0, 100], range: [200, 0], nice: false });
    expect(scale.invert(100)).toBe(50);
  });

  it('rounds the domain out to nice values', () => {
    const scale = createYScale({ domain: [3, 97], range: [100, 0] });
    expect(scale.domain).toEqual([0, 100]);
    expect(scale.ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('can leave the domain as it is', () => {
    const scale = createYScale({ domain: [3, 97], range: [100, 0], nice: false });
    expect(scale.domain).toEqual([3, 97]);
  });

  it('knows where zero is, held inside the range', () => {
    expect(createYScale({ domain: [-50, 50], range: [100, 0], nice: false }).baseline).toBe(50);
    expect(createYScale({ domain: [10, 50], range: [100, 0], nice: false }).baseline).toBe(100);
    expect(createYScale({ domain: [-50, -10], range: [100, 0], nice: false }).baseline).toBe(0);
  });

  it('formats ticks to suit the step', () => {
    const scale = createYScale({ domain: [0, 1], range: [100, 0] });
    const format = scale.tickFormat(5);
    expect(scale.ticks(5).map(format)).toEqual(['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
  });

  it('formats ticks with a specifier', () => {
    const scale = createYScale({ domain: [0, 5000], range: [100, 0] });
    expect(scale.tickFormat(5, '~s')(5000)).toBe('5k');
    expect(scale.tickFormat(5, '$,.0f')(5000)).toBe('$5,000');
  });
});

describe('inferXKind', () => {
  it('uses time for dates, linear for numbers and point for anything else', () => {
    expect(inferXKind([new Date(2024, 0, 1), new Date(2024, 1, 1)])).toBe('time');
    expect(inferXKind([1, 2, 3])).toBe('linear');
    expect(inferXKind(['a', 'b'])).toBe('point');
    expect(inferXKind([1, 'b'])).toBe('point');
  });

  it('looks past missing values, and falls back to point for nothing', () => {
    expect(inferXKind([null, 1, undefined, 2])).toBe('linear');
    expect(inferXKind([])).toBe('point');
  });
});

describe('createXScale: band', () => {
  const scale = createXScale({
    values: ['a', 'b', 'c', 'a'],
    kind: 'band',
    range: [0, 300],
    bandPadding: 0,
    outerPadding: 0,
  });

  it('gives each distinct category a slot, in the order they first appear', () => {
    expect(scale.domain).toEqual(['a', 'b', 'c']);
    expect(scale.bandwidth).toBe(100);
    expect(scale.step).toBe(100);
  });

  it('puts a value at the middle of its slot', () => {
    expect(scale.position('a')).toBe(50);
    expect(scale.position('b')).toBe(150);
    expect(scale.position('c')).toBe(250);
  });

  it('has no position for an unknown value', () => {
    expect(scale.position('z')).toBeNaN();
  });

  it('leaves room between bands for padding', () => {
    const padded = createXScale({
      values: ['a', 'b'],
      kind: 'band',
      range: [0, 100],
      bandPadding: 0.5,
      outerPadding: 0,
    });
    expect(padded.bandwidth).toBeLessThan(padded.step);
    expect(padded.step * (2 - 0.5)).toBeCloseTo(100, 5);
    expect(padded.bandwidth).toBeCloseTo(padded.step * 0.5, 5);
  });

  it('treats numbers as categories, and dates by their instant', () => {
    const years = createXScale({
      values: [2020, 2021],
      kind: 'band',
      range: [0, 100],
      bandPadding: 0,
      outerPadding: 0,
    });
    expect(years.position(2021)).toBe(75);
    const day = new Date(2024, 0, 1);
    const dates = createXScale({
      values: [day, new Date(2024, 0, 2)],
      kind: 'band',
      range: [0, 100],
      bandPadding: 0,
      outerPadding: 0,
    });
    expect(dates.position(new Date(2024, 0, 1))).toBe(25);
  });
});

describe('createXScale: point', () => {
  it('spaces categories evenly, with half a step at each end by default', () => {
    const scale = createXScale({ values: ['a', 'b', 'c'], kind: 'point', range: [0, 300] });
    expect(scale.bandwidth).toBe(0);
    expect(scale.step).toBeCloseTo(100, 5);
    expect(scale.position('a')).toBeCloseTo(50, 5);
    expect(scale.position('c')).toBeCloseTo(250, 5);
  });

  it('can put the first and last point on the edges', () => {
    const scale = createXScale({
      values: ['a', 'b', 'c'],
      kind: 'point',
      range: [0, 200],
      outerPadding: 0,
    });
    expect(scale.position('a')).toBe(0);
    expect(scale.position('c')).toBe(200);
  });

  it('copes with one category', () => {
    const scale = createXScale({ values: ['only'], kind: 'point', range: [0, 100] });
    expect(scale.step).toBe(0);
    expect(Number.isFinite(scale.position('only'))).toBe(true);
  });
});

describe('createXScale: linear', () => {
  const scale = createXScale({ values: [10, 20, 40], kind: 'linear', range: [0, 300] });

  it('places numbers by value', () => {
    expect(scale.domain).toEqual([10, 40]);
    expect(scale.position(10)).toBe(0);
    expect(scale.position(40)).toBe(300);
    expect(scale.position(20)).toBeCloseTo(100, 5);
  });

  it('has no position for something that is not a number', () => {
    expect(scale.position('x')).toBeNaN();
    expect(scale.position(null)).toBeNaN();
  });

  it('offers nice ticks and formats them', () => {
    const ticks = scale.ticks(4);
    expect(ticks).toEqual([10, 20, 30, 40]);
    expect(ticks.map(scale.tickFormat({ count: 4 }))).toEqual(['10', '20', '30', '40']);
  });

  it('copes with a single value', () => {
    const single = createXScale({ values: [5], kind: 'linear', range: [0, 100] });
    expect(Number.isFinite(single.position(5))).toBe(true);
  });
});

describe('createXScale: time', () => {
  const start = new Date(2024, 0, 1);
  const end = new Date(2024, 11, 31);
  const scale = createXScale({ values: [start, end], kind: 'time', range: [0, 365] });

  it('places dates by when they are', () => {
    expect(scale.position(start)).toBe(0);
    expect(scale.position(end)).toBe(365);
    expect(scale.position(new Date(2024, 6, 1))).toBeGreaterThan(150);
    expect(scale.position(new Date(2024, 6, 1))).toBeLessThan(200);
  });

  it('accepts numbers as times, and has no position for text', () => {
    expect(scale.position(start.getTime())).toBe(0);
    expect(scale.position('x')).toBeNaN();
  });

  it('gives date ticks, labelled for the span', () => {
    const ticks = scale.ticks(6);
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.every((tick) => tick instanceof Date)).toBe(true);
    expect(typeof scale.tickFormat({ locale: 'en-US' })(ticks[0])).toBe('string');
  });

  it('labels years when the span is years', () => {
    const years = createXScale({
      values: [new Date(2020, 0, 1), new Date(2024, 0, 1)],
      kind: 'time',
      range: [0, 100],
    });
    expect(years.tickFormat({ locale: 'en-US' })(new Date(2022, 0, 1))).toBe('2022');
  });
});

describe('ticks of a category scale', () => {
  it('lists every category when there is room', () => {
    const scale = createXScale({ values: ['a', 'b', 'c'], kind: 'band', range: [0, 100] });
    expect(scale.ticks(10)).toEqual(['a', 'b', 'c']);
  });

  it('thins them out when there is not', () => {
    const values = Array.from({ length: 12 }, (_, i) => `m${i}`);
    const scale = createXScale({ values, kind: 'point', range: [0, 100] });
    expect(scale.ticks(4)).toEqual(['m0', 'm3', 'm6', 'm9']);
  });
});

describe('uniqueCategories and thinCategories', () => {
  it('keeps the first appearance of each, skipping empty values', () => {
    expect(uniqueCategories(['b', 'a', 'b', null, undefined, 'c', 1])).toEqual([
      'b',
      'a',
      'c',
      '1',
    ]);
  });

  it('keeps about the number asked for, starting with the first', () => {
    expect(thinCategories([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([1, 4, 7]);
    expect(thinCategories([1, 2], 5)).toEqual([1, 2]);
    expect(thinCategories([1, 2, 3], 0)).toEqual([]);
  });
});

describe('nearestIndex', () => {
  const positions = [10, 50, 90, 130];

  it('finds the closest position', () => {
    expect(nearestIndex(positions, 0)).toBe(0);
    expect(nearestIndex(positions, 29)).toBe(0);
    expect(nearestIndex(positions, 31)).toBe(1);
    expect(nearestIndex(positions, 500)).toBe(3);
  });

  it('skips positions that are not numbers, and says -1 when none is usable', () => {
    expect(nearestIndex([NaN, 60, NaN], 0)).toBe(1);
    expect(nearestIndex([NaN], 0)).toBe(-1);
    expect(nearestIndex([], 0)).toBe(-1);
  });
});
