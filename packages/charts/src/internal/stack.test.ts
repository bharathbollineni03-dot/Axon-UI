import { describe, expect, it } from 'vitest';
import { stackSeries } from './stack';

const data = [
  { month: 'Jan', a: 10, b: 20, c: 30 },
  { month: 'Feb', a: 5, b: 0, c: 15 },
  { month: 'Mar', a: 8, b: null, c: 'x' },
];

describe('stackSeries', () => {
  it('stacks each series on the ones before it', () => {
    const stacked = stackSeries(data, ['a', 'b', 'c']);
    expect(stacked.get('a')).toEqual([
      { y0: 0, y1: 10 },
      { y0: 0, y1: 5 },
      { y0: 0, y1: 8 },
    ]);
    expect(stacked.get('b')).toEqual([
      { y0: 10, y1: 30 },
      { y0: 5, y1: 5 },
      { y0: 8, y1: 8 },
    ]);
    expect(stacked.get('c')![0]).toEqual({ y0: 30, y1: 60 });
  });

  it('counts missing and non-numeric values as zero', () => {
    const stacked = stackSeries(data, ['a', 'b', 'c']);
    expect(stacked.get('b')![2]).toEqual({ y0: 8, y1: 8 });
    expect(stacked.get('c')![2]).toEqual({ y0: 8, y1: 8 });
  });

  it('keeps the keys in the order given', () => {
    expect([...stackSeries(data, ['c', 'a']).keys()]).toEqual(['c', 'a']);
  });

  it('can make every stack add up to 1', () => {
    const stacked = stackSeries([{ a: 1, b: 3 }], ['a', 'b'], 'expand');
    expect(stacked.get('a')![0]).toEqual({ y0: 0, y1: 0.25 });
    expect(stacked.get('b')![0]).toEqual({ y0: 0.25, y1: 1 });
  });

  it('can stack negative values downwards', () => {
    const stacked = stackSeries([{ a: 5, b: -3, c: -2 }], ['a', 'b', 'c'], 'diverging');
    expect(stacked.get('a')![0]).toEqual({ y0: 0, y1: 5 });
    expect(stacked.get('b')![0]).toEqual({ y0: -3, y1: 0 });
    expect(stacked.get('c')![0]).toEqual({ y0: -5, y1: -3 });
  });

  it('can centre the stacks', () => {
    const stacked = stackSeries([{ a: 2, b: 2 }], ['a', 'b'], 'silhouette');
    expect(stacked.get('a')![0]).toEqual({ y0: -2, y1: 0 });
    expect(stacked.get('b')![0]).toEqual({ y0: 0, y1: 2 });
  });

  it('copes with no data and no keys', () => {
    expect(stackSeries([], ['a']).get('a')).toEqual([]);
    expect(stackSeries(data, []).size).toBe(0);
  });
});
