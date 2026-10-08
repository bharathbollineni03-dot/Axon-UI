import { describe, expect, it } from 'vitest';
import { chartColor, PALETTE_SIZE, resolveSeries } from './palette';
import { estimateTextWidth, resolveMargin } from './layout';

describe('estimateTextWidth', () => {
  it('grows with the text and with the font size', () => {
    expect(estimateTextWidth('1,000')).toBeGreaterThan(estimateTextWidth('10'));
    expect(estimateTextWidth('abc', 20)).toBeGreaterThan(estimateTextWidth('abc', 10));
    expect(estimateTextWidth('')).toBe(0);
  });
});

describe('resolveMargin', () => {
  it('leaves room only for what is shown', () => {
    const bare = resolveMargin({ showXAxis: false });
    expect(bare.left).toBe(bare.right);
    expect(bare.bottom).toBe(bare.top);
  });

  it('makes room for wider y labels on the left', () => {
    const narrow = resolveMargin({ leftLabels: ['0', '5'] });
    const wide = resolveMargin({ leftLabels: ['0', '1,000,000'] });
    expect(wide.left).toBeGreaterThan(narrow.left);
  });

  it('makes room on the right only for a right axis', () => {
    expect(resolveMargin({ leftLabels: ['0'] }).right).toBeLessThan(
      resolveMargin({ leftLabels: ['0'], rightLabels: ['100%'] }).right,
    );
  });

  it('makes room for the x axis and for titles', () => {
    const without = resolveMargin({ showXAxis: false });
    const withAxis = resolveMargin({ showXAxis: true });
    const withTitle = resolveMargin({ showXAxis: true, xLabel: true });
    expect(withAxis.bottom).toBeGreaterThan(without.bottom);
    expect(withTitle.bottom).toBeGreaterThan(withAxis.bottom);
    expect(resolveMargin({ leftLabels: ['1'], yLabel: true }).left).toBeGreaterThan(
      resolveMargin({ leftLabels: ['1'] }).left,
    );
  });

  it('can be overridden side by side', () => {
    expect(resolveMargin({ leftLabels: ['1000'], override: { left: 99 } }).left).toBe(99);
  });
});

describe('chartColor', () => {
  it('uses the palette variables in order', () => {
    expect(chartColor(0)).toBe('var(--axon-chart-1)');
    expect(chartColor(7)).toBe('var(--axon-chart-8)');
  });

  it('starts again after the last colour, and copes with negative numbers', () => {
    expect(chartColor(PALETTE_SIZE)).toBe('var(--axon-chart-1)');
    expect(chartColor(PALETTE_SIZE + 2)).toBe('var(--axon-chart-3)');
    expect(chartColor(-1)).toBe('var(--axon-chart-8)');
  });
});

describe('resolveSeries', () => {
  it('names a series after its key and gives it the next colour', () => {
    const [first, second] = resolveSeries([
      { key: 'revenue' },
      { key: 'costs', name: 'Costs', color: 'red' },
    ]);
    expect(first).toMatchObject({
      key: 'revenue',
      name: 'revenue',
      color: 'var(--axon-chart-1)',
      index: 0,
    });
    expect(second).toMatchObject({ key: 'costs', name: 'Costs', color: 'red', index: 1 });
  });

  it('keeps the extra fields of what it is given', () => {
    const [item] = resolveSeries([{ key: 'a', type: 'bar' }]);
    expect(item).toHaveProperty('type', 'bar');
  });
});
