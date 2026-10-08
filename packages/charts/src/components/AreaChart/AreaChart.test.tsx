import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { liveRegion, pointAt, tickLabels, tooltipOf } from '../../testing/chartTestUtils';
import { AreaChart, type AreaChartProps } from './AreaChart';

const data = [
  { month: 'Jan', web: 10, mobile: 30 },
  { month: 'Feb', web: 20, mobile: 20 },
  { month: 'Mar', web: 30, mobile: 10 },
];
const series = [
  { key: 'web', name: 'Web' },
  { key: 'mobile', name: 'Mobile' },
];

function renderChart(props: Partial<AreaChartProps> = {}) {
  return render(<AreaChart data={data} xKey="month" series={series} animate={false} {...props} />);
}

const areas = (container: HTMLElement) => [...container.querySelectorAll('path.axon-chart__area')];
const outlines = (container: HTMLElement) => [
  ...container.querySelectorAll('path.axon-chart__area-outline'),
];

/** The y coordinates a path visits, in order. */
const ys = (path: Element) =>
  [...path.getAttribute('d')!.matchAll(/[ML]([-\d.e]+),([-\d.e]+)/g)].map((m) => Number(m[2]));

describe('AreaChart', () => {
  it('draws a filled area and an outline for each series', () => {
    const { container } = renderChart();
    expect(areas(container)).toHaveLength(2);
    expect(outlines(container)).toHaveLength(2);
    expect((areas(container)[0] as SVGElement).style.fill).toBe('var(--axon-chart-1)');
  });

  it('is one image named by a summary', () => {
    renderChart();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /^Area chart with 2 series: Web, Mobile\. 3 data points from Jan to Mar\./,
    );
  });

  it('runs edge to edge, with no gap before the first point', () => {
    const { container } = renderChart();
    expect(areas(container)[0]!.getAttribute('d')).toMatch(/^M0,/);
  });

  it('fills lightly when overlapping, so the areas behind show through', () => {
    const { container } = renderChart();
    expect((areas(container)[0] as SVGElement).style.fillOpacity).toBe('0.2');
  });

  it('can hide the outline and change the fill', () => {
    const { container } = renderChart({ outline: false, fillOpacity: 0.5 });
    expect(outlines(container)).toHaveLength(0);
    expect((areas(container)[0] as SVGElement).style.fillOpacity).toBe('0.5');
  });

  it('always starts the value axis at zero', () => {
    const { container } = renderChart({
      data: [
        { month: 'Jan', web: 500 },
        { month: 'Feb', web: 510 },
      ],
      series: [{ key: 'web' }],
    });
    expect(tickLabels(container)).toContain('0');
  });

  it('closes each area back to the baseline', () => {
    const { container } = renderChart({ series: [series[0]!] });
    const path = areas(container)[0]!;
    // The shape ends by returning along the baseline, which is the bottom of the plot.
    const all = ys(path);
    expect(Math.max(...all)).toBeCloseTo(all[all.length - 1]!, 5);
  });

  describe('stacked', () => {
    it('piles one series on another so the top is the total', () => {
      const { container } = renderChart({ stacked: true });
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Stacked area chart/);
      // Every row totals 40, so the top of the pile is level; the two series meet at the same height in Feb.
      const [web, mobile] = outlines(container).map(ys) as [number[], number[]];
      expect(mobile[0]).toBeCloseTo(mobile[1]!, 5);
      expect(mobile[1]).toBeCloseTo(mobile[2]!, 5);
      // Web sits underneath: its top edge is lower on the page than the total's.
      expect(web[0]!).toBeGreaterThan(mobile[0]!);
    });

    it('fills more solidly than overlapping areas', () => {
      const { container } = renderChart({ stacked: true });
      expect((areas(container)[0] as SVGElement).style.fillOpacity).toBe('0.75');
    });

    it('makes the axis reach the total', () => {
      const { container } = renderChart({ stacked: true });
      const numbers = tickLabels(container).map(Number).filter(Number.isFinite);
      expect(Math.max(...numbers)).toBeGreaterThanOrEqual(40);
    });

    it('can show shares, with the axis in percent', () => {
      const { container } = renderChart({ stacked: 'percent' });
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
        /^100% stacked area chart/,
      );
      expect(tickLabels(container)).toEqual(expect.arrayContaining(['0%', '100%']));
    });

    it('lets you change the percent format', () => {
      const { container } = renderChart({
        stacked: 'percent',
        yAxis: { tickFormat: '.0%', label: 'Share' },
      });
      expect(container.querySelector('.axon-chart__axis-title')).toHaveTextContent('Share');
    });

    it('keeps the real values in the tooltip', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ stacked: 'percent' });
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}');
      expect(tooltipOf(container)).toHaveTextContent('10');
      expect(tooltipOf(container)).toHaveTextContent('30');
      expect(tooltipOf(container)).not.toHaveTextContent('%');
    });

    it('puts the dots on the top of each layer', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ stacked: true, dots: undefined } as never);
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}');
      const dots = [...container.querySelectorAll('circle.axon-chart__dot')];
      expect(dots).toHaveLength(2);
      // Two layers at the first row: web tops out at 10, mobile on top of it at 40.
      expect(Number(dots[1]!.getAttribute('cy'))).toBeLessThan(Number(dots[0]!.getAttribute('cy')));
    });
  });

  describe('interaction', () => {
    it('follows the pointer, with a guide line and the values at that row', () => {
      const { container } = renderChart();
      pointAt(container, 1000);
      expect(tooltipOf(container)).toHaveTextContent('Mar');
      expect(container.querySelector('.axon-chart__crosshair')).not.toBeNull();
      expect(within(tooltipOf(container)!).getByText('Web').nextSibling).toHaveTextContent('30');
    });

    it('steps with the arrow keys and announces each row', async () => {
      const user = userEvent.setup();
      renderChart();
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Feb: Web 20, Mobile 20');
    });

    it('hides a series from the legend, and the stack closes up', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ stacked: true });
      await user.click(screen.getByRole('button', { name: 'Mobile' }));
      expect(areas(container)).toHaveLength(1);
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/1 series: Web/);
    });
  });

  it('has a hidden data table', () => {
    renderChart({ title: 'Traffic' });
    expect(screen.getByRole('table', { name: 'Data for Traffic' })).toBeInTheDocument();
  });

  it('can curve', () => {
    const { container } = renderChart({ curve: 'monotone' });
    expect(areas(container)[0]!.getAttribute('d')).toMatch(/C/);
  });

  it('shows loading and empty states', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<AreaChart data={[]} xKey="month" series={series} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    for (const props of [{}, { stacked: true as const }, { stacked: 'percent' as const }]) {
      const { container, unmount } = renderChart({ title: 'Traffic', ...props });
      expect(await axe(container)).toHaveNoViolations();
      fireEvent.keyDown(screen.getByRole('img'), { key: 'ArrowRight' });
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
