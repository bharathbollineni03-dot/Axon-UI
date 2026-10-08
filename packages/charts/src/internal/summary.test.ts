import { describe, expect, it } from 'vitest';
import { describeCartesian, valueRange } from './summary';

const data = [
  { m: 'Jan', a: 10, b: 5 },
  { m: 'Feb', a: 30, b: 5 },
  { m: 'Mar', a: 20, b: null },
];
const names = [
  { key: 'a', name: 'Alpha' },
  { key: 'b', name: 'Beta' },
];
const base = {
  kind: 'Line chart',
  data,
  xKey: 'm',
  formatX: String,
  formatValue: (v: number) => `${v}`,
};

describe('describeCartesian', () => {
  it('says what it is, how much data there is, and where each series peaks and bottoms out', () => {
    expect(describeCartesian({ ...base, series: names })).toBe(
      'Line chart with 2 series: Alpha, Beta. 3 data points from Jan to Mar. ' +
        'Alpha ranges from 10 at Jan to 30 at Feb. Beta is 5 at Jan.',
    );
  });

  it('puts the title first and the description last, each as a sentence', () => {
    const text = describeCartesian({
      ...base,
      series: [names[0]!],
      title: 'Sales',
      description: 'In thousands',
    });
    expect(text.startsWith('Sales. Line chart')).toBe(true);
    expect(text.endsWith('In thousands.')).toBe(true);
  });

  it('does not add a second full stop', () => {
    const text = describeCartesian({ ...base, series: [names[0]!], title: 'Sales?' });
    expect(text.startsWith('Sales? Line')).toBe(true);
  });

  it('says so for no data', () => {
    expect(describeCartesian({ ...base, data: [], series: names })).toBe(
      'Line chart with no data.',
    );
  });

  it('says "1 series" and "1 data point"', () => {
    const text = describeCartesian({ ...base, data: [data[0]!], series: [names[0]!] });
    expect(text).toMatch(/with 1 series: Alpha\./);
    expect(text).toMatch(/1 data point at Jan\./);
  });

  it('only names the series when there are many', () => {
    const many = ['a', 'b', 'c', 'd'].map((key) => ({ key, name: key.toUpperCase() }));
    const text = describeCartesian({
      ...base,
      data: [{ m: 'x', a: 1, b: 2, c: 3, d: 4 }],
      series: many,
    });
    expect(text).toContain('4 series: A, B, C, D.');
    expect(text).not.toMatch(/ranges from| is \d/);
  });
});

describe('valueRange', () => {
  it('finds the lowest and highest value and where they are', () => {
    expect(valueRange(data, 'm', 'a')).toEqual({
      low: { value: 10, index: 0 },
      high: { value: 30, index: 1 },
    });
  });

  it('skips missing values, and is null when there are none', () => {
    expect(valueRange(data, 'm', 'b')).toEqual({
      low: { value: 5, index: 0 },
      high: { value: 5, index: 0 },
    });
    expect(valueRange(data, 'm', 'nothing')).toBeNull();
  });
});
