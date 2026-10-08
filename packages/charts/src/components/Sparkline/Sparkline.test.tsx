import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Sparkline, type SparklineProps } from './Sparkline';

const values = [10, 8, 14, 20, 12];

function renderSpark(props: Partial<SparklineProps> = {}) {
  return render(<Sparkline data={values} {...props} />).container.querySelector('svg')!;
}

const noNaN = (svg: Element) => {
  for (const el of svg.querySelectorAll('[d], circle, rect')) {
    const text = el.outerHTML;
    expect(text).not.toMatch(/NaN|Infinity/);
  }
};

describe('Sparkline', () => {
  it('is an image described by where the trend starts, ends, bottoms out and peaks', () => {
    renderSpark();
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Trend of 5 values, from 10 to 12. Lowest 8, highest 20.',
    );
  });

  it('takes a description of your own', () => {
    renderSpark({ ariaLabel: 'Weekly sign-ups, up 12%' });
    expect(screen.getByRole('img', { name: 'Weekly sign-ups, up 12%' })).toBeInTheDocument();
  });

  it('can be hidden from assistive technology when the text beside it says it all', () => {
    const svg = renderSpark({ decorative: true });
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('formats the numbers in its description', () => {
    renderSpark({ data: [1000, 2500], valueFormat: '$,.0f' });
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Trend of 2 values, from $1,000 to $2,500. Lowest $1,000, highest $2,500.',
    );
  });

  it('says so for no data and for a single value', () => {
    const { rerender } = render(<Sparkline data={[]} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Trend with no data.');
    rerender(<Sparkline data={[7]} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Trend with 1 value: 7.');
  });

  it('is the size asked for, and inline', () => {
    const svg = renderSpark({ width: 120, height: 40 });
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveClass('axon-sparkline');
  });

  describe('line', () => {
    it('draws a line, and a dot on the last value', () => {
      const svg = renderSpark();
      expect(svg.querySelector('path.axon-sparkline__line')!.getAttribute('d')).toMatch(/^M/);
      expect(svg.querySelectorAll('circle.axon-sparkline__dot--last')).toHaveLength(1);
      expect(svg.querySelector('path.axon-sparkline__area')).toBeNull();
    });

    it('puts the lowest value at the bottom and the highest at the top', () => {
      const svg = renderSpark({ showExtremes: true });
      const dots = [...svg.querySelectorAll('circle.axon-sparkline__dot--extreme')];
      const [low, high] = dots.map((dot) => Number(dot.getAttribute('cy'))) as [number, number];
      expect(low).toBeGreaterThan(high);
    });

    it('can mark the lowest and highest values', () => {
      expect(
        renderSpark({ showExtremes: true }).querySelectorAll('circle.axon-sparkline__dot--extreme'),
      ).toHaveLength(2);
    });

    it('can leave the last dot off, and use a colour of its own', () => {
      const svg = renderSpark({ showLast: false, color: 'tomato' });
      expect(svg.querySelectorAll('circle.axon-sparkline__dot--last')).toHaveLength(0);
      expect((svg.querySelector('path.axon-sparkline__line') as SVGElement).style.stroke).toBe(
        'tomato',
      );
    });

    it('uses the first palette colour by default', () => {
      expect(
        (renderSpark().querySelector('path.axon-sparkline__line') as SVGElement).style.stroke,
      ).toBe('var(--axon-chart-1)');
    });

    it('leaves a gap at a missing value', () => {
      const svg = renderSpark({ data: [1, null, 3], curve: 'linear' });
      expect(
        (svg.querySelector('path.axon-sparkline__line')!.getAttribute('d')!.match(/M/g) ?? [])
          .length,
      ).toBe(2);
    });

    it('stays inside its box, whatever the values', () => {
      const svg = renderSpark({ height: 30 });
      for (const dot of svg.querySelectorAll('circle')) {
        expect(Number(dot.getAttribute('cy'))).toBeGreaterThanOrEqual(0);
        expect(Number(dot.getAttribute('cy'))).toBeLessThanOrEqual(30);
      }
    });
  });

  it('can be an area', () => {
    const svg = renderSpark({ type: 'area' });
    expect(svg.querySelector('path.axon-sparkline__area')).not.toBeNull();
    expect(svg.querySelector('path.axon-sparkline__line')).not.toBeNull();
  });

  describe('bars', () => {
    it('draws a bar for each value, tall in proportion', () => {
      const svg = renderSpark({ type: 'bar' });
      const rects = [...svg.querySelectorAll('rect.axon-sparkline__bar')];
      expect(rects).toHaveLength(5);
      const heights = rects.map((r) => Number(r.getAttribute('height')));
      expect(heights[3]).toBe(Math.max(...heights));
      expect(heights[1]).toBe(Math.min(...heights));
      expect(svg.querySelector('path.axon-sparkline__line')).toBeNull();
    });

    it('skips missing values and has no end dot', () => {
      const svg = renderSpark({ type: 'bar', data: [3, null, 5] });
      expect(svg.querySelectorAll('rect.axon-sparkline__bar')).toHaveLength(2);
      expect(svg.querySelectorAll('circle.axon-sparkline__dot--last')).toHaveLength(0);
    });
  });

  it('reads rows by key, and numbers given as text', () => {
    renderSpark({ data: [{ value: 1 }, { value: '5' }, { other: 9 }], valueKey: 'value' });
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /Trend of 2 values, from 1 to 5\./,
    );
    renderSpark({ data: [{ n: 2 }, { n: 4 }], valueKey: 'n' });
    expect(screen.getAllByRole('img')[1]!.getAttribute('aria-label')).toMatch(/from 2 to 4/);
  });

  it('can fix the ends of the scale', () => {
    const fitted = renderSpark({ data: [50, 60] });
    const fixed = renderSpark({ data: [50, 60], min: 0, max: 100 });
    const cy = (svg: Element) =>
      Number(svg.querySelector('circle.axon-sparkline__dot--last')!.getAttribute('cy'));
    expect(cy(fixed)).toBeGreaterThan(cy(fitted));
  });

  it('draws sensible numbers for an empty, single and flat series', () => {
    for (const data of [[], [5], [5, 5, 5], [0, 0], [null, null]]) {
      noNaN(renderSpark({ data }));
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Sparkline data={values} />);
    expect(await axe(container)).toHaveNoViolations();
    const { container: hidden } = render(<Sparkline data={values} decorative />);
    expect(await axe(hidden)).toHaveNoViolations();
  });
});
