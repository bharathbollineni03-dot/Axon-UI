import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { liveRegion, plotOrigin, tickLabels, tooltipOf } from '../../testing/chartTestUtils';
import { ScatterChart, type ScatterChartProps } from './ScatterChart';

const data = [
  { name: 'Alpha', spend: 100, conv: 10, revenue: 500, group: 'Search' },
  { name: 'Beta', spend: 200, conv: 30, revenue: 1500, group: 'Social' },
  { name: 'Gamma', spend: 300, conv: 20, revenue: 900, group: 'Search' },
  { name: 'Delta', spend: 400, conv: 40, revenue: 2500, group: 'Email' },
];

function renderChart(props: Partial<ScatterChartProps> = {}) {
  return render(<ScatterChart data={data} xKey="spend" yKey="conv" animate={false} {...props} />);
}

const points = (container: HTMLElement) => [
  ...container.querySelectorAll('circle.axon-chart__point'),
];
const cx = (el: Element) => Number(el.getAttribute('cx'));
const cy = (el: Element) => Number(el.getAttribute('cy'));
const radius = (el: Element) => Number(el.getAttribute('r'));
const chart = () => screen.getByRole('img');

function pointerAt(container: HTMLElement, plotX: number, plotY: number) {
  const { x, y } = plotOrigin(container);
  fireEvent.pointerMove(container.querySelector('.axon-chart__hit')!, {
    clientX: x + plotX,
    clientY: y + plotY,
  });
}

describe('ScatterChart', () => {
  describe('placing points', () => {
    it('draws a point for each row, further right for a bigger x and higher up for a bigger y', () => {
      const { container } = renderChart();
      const [alpha, beta, gamma, delta] = points(container) as [Element, Element, Element, Element];
      expect(points(container)).toHaveLength(4);
      expect(cx(alpha)).toBeLessThan(cx(beta));
      expect(cx(beta)).toBeLessThan(cx(gamma));
      expect(cx(gamma)).toBeLessThan(cx(delta));
      // Higher on the page is a smaller y coordinate.
      expect(cy(delta)).toBeLessThan(cy(beta));
      expect(cy(beta)).toBeLessThan(cy(gamma));
      expect(cy(gamma)).toBeLessThan(cy(alpha));
    });

    it('is one image named by a summary of both axes', () => {
      renderChart({ title: 'Channels' });
      expect(chart().getAttribute('aria-label')).toBe(
        'Channels. Scatter chart of 4 points: spend from 100 to 400 and conv from 10 to 40.',
      );
    });

    it('titles the axes with the keys, or the labels you give', () => {
      const { container, rerender } = renderChart();
      const titles = () =>
        [...container.querySelectorAll('.axon-chart__axis-title')].map((el) => el.textContent);
      expect(titles()).toEqual(expect.arrayContaining(['spend', 'conv']));
      rerender(
        <ScatterChart
          data={data}
          xKey="spend"
          yKey="conv"
          xAxis={{ label: 'Spend ($)' }}
          yAxis={{ label: 'Conversions' }}
          animate={false}
        />,
      );
      expect(titles()).toEqual(expect.arrayContaining(['Spend ($)', 'Conversions']));
    });

    it('labels both axes with nice numbers, and can format them', () => {
      const { container } = renderChart({
        xAxis: { tickFormat: '$,.0f' },
        yAxis: { tickFormat: (value: unknown) => `${value} conv` },
      });
      expect(tickLabels(container)).toEqual(
        expect.arrayContaining(['$100', '$400', '10 conv', '40 conv']),
      );
    });

    it('can fix the ends of the axes', () => {
      const { container } = renderChart({ xDomain: [0, 1000], yDomain: [0, 100] });
      expect(tickLabels(container)).toEqual(expect.arrayContaining(['0', '1,000', '100']));
    });

    it('leaves out a row that has no number for both axes', () => {
      const { container } = renderChart({
        data: [
          ...data,
          { name: 'Bad', spend: 'x', conv: 5 },
          { name: 'Missing', spend: 5, conv: null },
        ],
      });
      expect(points(container)).toHaveLength(4);
      expect(chart().getAttribute('aria-label')).toMatch(/4 points/);
    });

    it('reads numbers given as text', () => {
      const { container } = renderChart({
        data: [
          { spend: '100', conv: '10' },
          { spend: '200', conv: '20' },
        ],
      });
      expect(points(container)).toHaveLength(2);
    });

    it('has the opacity and size asked for', () => {
      const { container } = renderChart({ opacity: 0.4, pointSize: 9 });
      expect((points(container)[0] as SVGElement).style.fillOpacity).toBe('0.4');
      expect(radius(points(container)[0]!)).toBe(9);
    });
  });

  describe('size', () => {
    it('sizes points by area between the smallest and largest radius', () => {
      const { container } = renderChart({ sizeKey: 'revenue', sizeRange: [4, 20] });
      // Points are drawn biggest first, so the radii run from largest to smallest.
      const radii = points(container).map(radius);
      expect(radii[0]).toBeCloseTo(20, 5);
      expect(radii[radii.length - 1]).toBeCloseTo(4, 5);
      expect(new Set(radii.map((r) => r.toFixed(3))).size).toBe(4);
      // Area, not width, follows the value: the radius goes with its square root.
      const [biggest, , , smallest] = radii as [number, number, number, number];
      expect((biggest * biggest - 16) / (smallest * smallest - 16 || 1)).toBeGreaterThan(1);
    });

    it('draws big points first so small ones are not hidden', () => {
      const { container } = renderChart({ sizeKey: 'revenue' });
      const radii = points(container).map(radius);
      expect(radii).toEqual([...radii].sort((a, b) => b - a));
    });

    it('adds the size to the description of a point', () => {
      const { container } = renderChart({ sizeKey: 'revenue', labelKey: 'name' });
      const biggest = points(container)[0]!;
      pointerAt(container, cx(biggest), cy(biggest));
      expect(within(tooltipOf(container)!).getByText('revenue').nextSibling).toHaveTextContent(
        '2,500',
      );
    });
  });

  describe('groups', () => {
    it('colours points by group, and lists the groups in a legend', () => {
      const { container } = renderChart({ colorKey: 'group' });
      const fills = points(container).map((el) => (el as SVGElement).style.fill);
      expect(fills).toEqual([
        'var(--axon-chart-1)',
        'var(--axon-chart-2)',
        'var(--axon-chart-1)',
        'var(--axon-chart-3)',
      ]);
      expect(
        within(screen.getByRole('list', { name: 'Legend' }))
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Search', 'Social', 'Email']);
      expect(chart().getAttribute('aria-label')).toMatch(/3 groups: Search, Social, Email\./);
    });

    it('hides a group from the legend, and the axes follow the points that are left', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ colorKey: 'group' });
      const before = tickLabels(container);
      await user.click(screen.getByRole('button', { name: 'Email' }));
      expect(points(container)).toHaveLength(3);
      expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(tickLabels(container)).not.toEqual(before);
    });

    it('can take colours by name or in order', () => {
      const { container, rerender } = renderChart({
        colorKey: 'group',
        colors: { Search: 'red', Email: 'blue' },
      });
      expect((points(container)[0] as SVGElement).style.fill).toBe('red');
      expect((points(container)[1] as SVGElement).style.fill).toBe('var(--axon-chart-2)');
      rerender(
        <ScatterChart
          data={data}
          xKey="spend"
          yKey="conv"
          colorKey="group"
          colors={['pink', 'teal', 'gold']}
          animate={false}
        />,
      );
      expect((points(container)[1] as SVGElement).style.fill).toBe('teal');
    });

    it('has no legend without groups, or when turned off', () => {
      const { rerender } = renderChart();
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
      rerender(
        <ScatterChart
          data={data}
          xKey="spend"
          yKey="conv"
          colorKey="group"
          legend={false}
          animate={false}
        />,
      );
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
    });

    it('dims the other groups while one legend item is pointed at', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ colorKey: 'group' });
      await user.hover(screen.getByRole('button', { name: 'Search' }));
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(2);
    });
  });

  describe('reading a point', () => {
    it('shows the point the pointer is near: its name, values and group', () => {
      const { container } = renderChart({ labelKey: 'name', colorKey: 'group' });
      const beta = points(container)[1]!;
      pointerAt(container, cx(beta) + 3, cy(beta) - 2);
      const box = tooltipOf(container)!;
      expect(box).toHaveTextContent('Beta');
      expect(within(box).getByText('spend').nextSibling).toHaveTextContent('200');
      expect(within(box).getByText('conv').nextSibling).toHaveTextContent('30');
      expect(within(box).getByText('group').nextSibling).toHaveTextContent('Social');
      expect(points(container)[1]).toHaveAttribute('data-active', 'true');
    });

    it('shows nothing when the pointer is far from every point', () => {
      const { container } = renderChart();
      const alpha = points(container)[0]!;
      pointerAt(container, cx(alpha) + 60, cy(alpha) + 60);
      expect(tooltipOf(container)).toBeNull();
    });

    it('goes away when the pointer leaves', () => {
      const { container } = renderChart();
      const alpha = points(container)[0]!;
      pointerAt(container, cx(alpha), cy(alpha));
      expect(tooltipOf(container)).not.toBeNull();
      fireEvent.pointerLeave(container.querySelector('.axon-chart__hit')!);
      expect(tooltipOf(container)).toBeNull();
    });

    it('picks the nearest of two close points', () => {
      const { container } = renderChart({
        data: [
          { n: 'near', spend: 100, conv: 10 },
          { n: 'far', spend: 101, conv: 10.4 },
        ],
        labelKey: 'n',
      });
      const [first, second] = points(container) as [Element, Element];
      pointerAt(container, cx(second), cy(second));
      expect(tooltipOf(container)).toHaveTextContent('far');
      pointerAt(container, cx(first), cy(first));
      expect(tooltipOf(container)).toHaveTextContent('near');
    });

    it('can turn the tooltip off', () => {
      const { container } = renderChart({ tooltip: false });
      const alpha = points(container)[0]!;
      pointerAt(container, cx(alpha), cy(alpha));
      expect(tooltipOf(container)).toBeNull();
    });

    it('calls onPointClick with the row that was pressed', () => {
      const onPointClick = vi.fn();
      const { container } = renderChart({ onPointClick });
      const gamma = points(container)[2]!;
      pointerAt(container, cx(gamma), cy(gamma));
      fireEvent.click(container.querySelector('.axon-chart__hit')!);
      expect(onPointClick).toHaveBeenCalledWith(data[2], 2);
    });
  });

  describe('the keyboard', () => {
    it('steps through the points from left to right, announcing each', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ labelKey: 'name', colorKey: 'group' });
      chart().focus();
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Alpha: spend 100, conv 10, group Search');
      expect(tooltipOf(container)).toHaveTextContent('Alpha');
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Gamma:');
      await user.keyboard('{ArrowLeft}');
      expect(liveRegion()).toHaveTextContent('Beta:');
    });

    it('jumps to the ends, starts from the last with ArrowLeft, and lets go with Escape', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({ labelKey: 'name' });
      chart().focus();
      await user.keyboard('{End}');
      expect(liveRegion()).toHaveTextContent('Delta:');
      await user.keyboard('{Home}');
      expect(liveRegion()).toHaveTextContent('Alpha:');
      await user.keyboard('{Escape}');
      expect(tooltipOf(container)).toBeNull();
      await user.keyboard('{ArrowLeft}');
      expect(liveRegion()).toHaveTextContent('Delta:');
    });

    it('chooses a point with Enter', async () => {
      const user = userEvent.setup();
      const onPointClick = vi.fn();
      renderChart({ onPointClick });
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      expect(onPointClick).toHaveBeenCalledWith(data[1], 1);
    });

    it('follows only the points that are showing', async () => {
      const user = userEvent.setup();
      renderChart({ labelKey: 'name', colorKey: 'group' });
      await user.click(screen.getByRole('button', { name: 'Social' }));
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Gamma:');
    });
  });

  it('has a hidden table with every row', () => {
    renderChart({ title: 'Channels', labelKey: 'name', colorKey: 'group', sizeKey: 'revenue' });
    const table = screen.getByRole('table', { name: 'Data for Channels' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['name', 'group', 'spend', 'conv', 'revenue']);
    expect(within(table).getAllByRole('row')).toHaveLength(5);
  });

  it('shows loading and empty states, including when no row can be placed', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<ScatterChart data={[]} xKey="spend" yKey="conv" />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    rerender(<ScatterChart data={[{ spend: 'x', conv: 'y' }]} xKey="spend" yKey="conv" />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('copes with a single point', () => {
    const { container } = renderChart({ data: [data[0]!] });
    expect(points(container)).toHaveLength(1);
    expect(Number.isFinite(cx(points(container)[0]!))).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderChart({
      title: 'Channels',
      labelKey: 'name',
      colorKey: 'group',
      sizeKey: 'revenue',
    });
    expect(await axe(container)).toHaveNoViolations();
    chart().focus();
    fireEvent.keyDown(chart(), { key: 'ArrowRight' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
