import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createXScale, createYScale } from '../../internal/scales';
import { Axis, XAxis, YAxis } from './Axis';
import { fitTickCount, xScaleTicks, yScaleTicks, type AxisTick } from './ticks';

const ticks: AxisTick[] = [
  { value: 'a', position: 20, label: 'A' },
  { value: 'b', position: 60, label: 'B' },
];

const inSvg = (node: React.ReactNode) => render(<svg>{node}</svg>).container.querySelector('svg')!;
const labels = (svg: Element) => [...svg.querySelectorAll('.axon-chart__tick-label')];

describe('XAxis', () => {
  it('draws a line, a tick and a label for each tick, below the plot', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} y={80} />);
    expect(svg.querySelector('g.axon-chart__axis--bottom')).toHaveAttribute(
      'transform',
      'translate(0, 80)',
    );
    expect(svg.querySelectorAll('.axon-chart__tick-line')).toHaveLength(2);
    expect(labels(svg).map((l) => l.textContent)).toEqual(['A', 'B']);
    expect(labels(svg)[0]).toHaveAttribute('text-anchor', 'middle');
    const line = svg.querySelector('.axon-chart__axis-line')!;
    expect(line).toHaveAttribute('x1', '0');
    expect(line).toHaveAttribute('x2', '100');
  });

  it('puts each tick at its position', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} />);
    const groups = svg.querySelectorAll('.axon-chart__axis > g');
    expect(groups[0]).toHaveAttribute('transform', 'translate(20, 0)');
    expect(groups[1]).toHaveAttribute('transform', 'translate(60, 0)');
  });

  it('draws grid lines up the plot when asked', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} y={80} gridLength={80} />);
    const grid = svg.querySelectorAll('.axon-chart__grid-line');
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveAttribute('y2', '-80');
  });

  it('draws none by default', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} />);
    expect(svg.querySelectorAll('.axon-chart__grid-line')).toHaveLength(0);
  });

  it('can go on top, with labels above the line', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} top />);
    expect(svg.querySelector('g.axon-chart__axis--top')).not.toBeNull();
    expect(Number(labels(svg)[0]!.getAttribute('y'))).toBeLessThan(0);
  });

  it('has a title, centred under the axis', () => {
    const svg = inSvg(<XAxis ticks={ticks} range={[0, 100]} label="Month" />);
    const title = svg.querySelector('.axon-chart__axis-title')!;
    expect(title).toHaveTextContent('Month');
    expect(title).toHaveAttribute('x', '50');
  });
});

describe('YAxis', () => {
  it('puts labels to the left of the line, right-aligned', () => {
    const svg = inSvg(<YAxis ticks={ticks} range={[100, 0]} />);
    expect(svg.querySelector('g.axon-chart__axis--left')).toHaveAttribute(
      'transform',
      'translate(0, 0)',
    );
    expect(labels(svg)[0]).toHaveAttribute('text-anchor', 'end');
    expect(Number(labels(svg)[0]!.getAttribute('x'))).toBeLessThan(0);
  });

  it('draws grid lines across the plot', () => {
    const svg = inSvg(<YAxis ticks={ticks} range={[100, 0]} gridLength={200} />);
    expect(svg.querySelector('.axon-chart__grid-line')).toHaveAttribute('x2', '200');
  });

  it('can sit on the right, with labels to the right and grid lines running back', () => {
    const svg = inSvg(<YAxis ticks={ticks} range={[100, 0]} x={300} right gridLength={300} />);
    expect(svg.querySelector('g.axon-chart__axis--right')).toHaveAttribute(
      'transform',
      'translate(300, 0)',
    );
    expect(labels(svg)[0]).toHaveAttribute('text-anchor', 'start');
    expect(svg.querySelector('.axon-chart__grid-line')).toHaveAttribute('x2', '-300');
  });

  it('has a title turned to read upwards', () => {
    const svg = inSvg(<YAxis ticks={ticks} range={[100, 0]} label="Sales" />);
    expect(svg.querySelector('.axon-chart__axis-title')!.getAttribute('transform')).toMatch(
      /rotate\(-90\)/,
    );
  });
});

describe('Axis', () => {
  it('is hidden from assistive technology: the chart is described as a whole', () => {
    const svg = inSvg(<Axis orientation="bottom" ticks={ticks} range={[0, 10]} offset={0} />);
    expect(svg.querySelector('.axon-chart__axis')).toHaveAttribute('aria-hidden', 'true');
  });

  it('skips a tick with no usable position', () => {
    const svg = inSvg(
      <XAxis ticks={[...ticks, { value: 'z', position: NaN, label: 'Z' }]} range={[0, 100]} />,
    );
    expect(labels(svg)).toHaveLength(2);
  });

  it('draws just the line with no ticks', () => {
    const svg = inSvg(<XAxis ticks={[]} range={[0, 100]} />);
    expect(svg.querySelector('.axon-chart__axis-line')).not.toBeNull();
    expect(labels(svg)).toHaveLength(0);
  });
});

describe('xScaleTicks', () => {
  it('positions and labels category ticks', () => {
    const scale = createXScale({
      values: ['a', 'b', 'c'],
      kind: 'band',
      range: [0, 300],
      bandPadding: 0,
      outerPadding: 0,
    });
    expect(xScaleTicks(scale)).toEqual([
      { value: 'a', position: 50, label: 'a' },
      { value: 'b', position: 150, label: 'b' },
      { value: 'c', position: 250, label: 'c' },
    ]);
  });

  it('formats numbers plainly, with a specifier or with your own function', () => {
    const scale = createXScale({ values: [2020, 2024], kind: 'linear', range: [0, 100] });
    expect(xScaleTicks(scale, { count: 2 })[0]!.label).toBe('2020');
    expect(xScaleTicks(scale, { count: 2, format: '~s' })[0]!.label).toMatch(/k/);
    expect(xScaleTicks(scale, { count: 2, format: (v) => `Y${v}` })[0]!.label).toBe('Y2020');
  });
});

describe('yScaleTicks', () => {
  const scale = createYScale({ domain: [0, 100], range: [100, 0] });

  it('positions and labels value ticks', () => {
    expect(yScaleTicks(scale, { count: 2 })).toEqual([
      { value: 0, position: 100, label: '0' },
      { value: 50, position: 50, label: '50' },
      { value: 100, position: 0, label: '100' },
    ]);
  });

  it('formats with a specifier or a function', () => {
    expect(yScaleTicks(scale, { count: 2, format: '$,.0f' })[2]!.label).toBe('$100');
    expect(yScaleTicks(scale, { count: 2, format: (v) => `${v}%` })[1]!.label).toBe('50%');
  });
});

describe('fitTickCount', () => {
  const wide = (count: number) => Array.from({ length: count }, () => ({ label: 'January' }));

  it('uses the most ticks that fit', () => {
    expect(fitTickCount(wide, 2000)).toBe(10);
  });

  it('uses fewer when the labels would touch', () => {
    expect(fitTickCount(wide, 300)).toBeLessThan(10);
    expect(fitTickCount(wide, 300)).toBeGreaterThanOrEqual(2);
  });

  it('never goes below 2', () => {
    expect(fitTickCount(wide, 1)).toBe(2);
  });

  it('can be told the most to try and the gap to leave', () => {
    expect(fitTickCount(wide, 2000, { maxCount: 4 })).toBe(4);
    expect(fitTickCount(wide, 400, { gap: 0 })).toBeGreaterThan(
      fitTickCount(wide, 400, { gap: 40 }),
    );
  });
});
