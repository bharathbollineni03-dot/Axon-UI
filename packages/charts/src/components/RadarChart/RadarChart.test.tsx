import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { liveRegion, tooltipOf } from '../../testing/chartTestUtils';
import { RadarChart, type RadarChartProps } from './RadarChart';

const data = [
  { skill: 'Design', current: 70, target: 80 },
  { skill: 'Frontend', current: 90, target: 85 },
  { skill: 'Backend', current: 60, target: 80 },
  { skill: 'Testing', current: 50, target: 75 },
];
const series = [
  { key: 'current', name: 'Current' },
  { key: 'target', name: 'Target' },
];

function renderChart(props: Partial<RadarChartProps> = {}) {
  return render(
    <RadarChart data={data} axisKey="skill" series={series} animate={false} {...props} />,
  );
}

const areas = (container: HTMLElement) => [
  ...container.querySelectorAll('polygon.axon-chart__radar-area'),
];
const rings = (container: HTMLElement) => [
  ...container.querySelectorAll('polygon.axon-chart__radar-ring'),
];
const spokes = (container: HTMLElement) => [
  ...container.querySelectorAll('line.axon-chart__radar-spoke'),
];
const axisLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('text.axon-chart__radar-label')].map((el) => el.textContent);
const chart = () => screen.getByRole('img');

/** The corners of a polygon, as [x, y] pairs. */
const corners = (polygon: Element) =>
  polygon
    .getAttribute('points')!
    .split(' ')
    .map((pair) => pair.split(',').map(Number) as [number, number]);

// The default size: 600 wide, 340 tall, so the centre is (300, 170).
const CX = 300;
const CY = 170;
const distance = ([x, y]: [number, number]) => Math.hypot(x - CX, y - CY);

function pointerAtAngle(container: HTMLElement, degrees: number, r = 80) {
  const angle = (degrees * Math.PI) / 180;
  fireEvent.pointerMove(container.querySelector('.axon-chart__hit')!, {
    clientX: CX + r * Math.sin(angle),
    clientY: CY - r * Math.cos(angle),
  });
}

describe('RadarChart', () => {
  describe('what it draws', () => {
    it('is one image named by a summary of each series', () => {
      renderChart({ title: 'Team skills' });
      expect(chart().getAttribute('aria-label')).toBe(
        'Team skills. Radar chart with 4 axes: Design, Frontend, Backend, Testing. ' +
          'Current is highest on Frontend (90) and lowest on Testing (50). ' +
          'Target is highest on Frontend (85) and lowest on Testing (75).',
      );
    });

    it('draws a shape for each series, a spoke for each axis, and rings between', () => {
      const { container } = renderChart();
      expect(areas(container)).toHaveLength(2);
      expect(spokes(container)).toHaveLength(4);
      expect(rings(container).length).toBeGreaterThanOrEqual(3);
      expect(axisLabels(container)).toEqual(['Design', 'Frontend', 'Backend', 'Testing']);
    });

    it('puts the first axis straight up, and the others clockwise round the circle', () => {
      const { container } = renderChart();
      const [design, frontend, backend, testing] = corners(areas(container)[0]!);
      expect(design![0]).toBeCloseTo(CX, 4);
      expect(design![1]).toBeLessThan(CY);
      expect(frontend![0]).toBeGreaterThan(CX);
      expect(backend![1]).toBeGreaterThan(CY);
      expect(testing![0]).toBeLessThan(CX);
    });

    it('puts each corner at a distance in proportion to its value, from a centre of 0', () => {
      const { container } = renderChart();
      const radii = corners(areas(container)[0]!).map(distance);
      expect(radii[1]! / radii[0]!).toBeCloseTo(90 / 70, 4);
      expect(radii[3]! / radii[2]!).toBeCloseTo(50 / 60, 4);
    });

    it('draws a missing value at the centre', () => {
      const { container } = renderChart({
        data: [...data.slice(0, 3), { skill: 'Testing', current: null, target: 75 }],
      });
      expect(distance(corners(areas(container)[0]!)[3]!)).toBeCloseTo(0, 4);
    });

    it('draws in the palette colours, translucent, with the outline', () => {
      const { container } = renderChart({ fillOpacity: 0.3 });
      const first = areas(container)[0] as SVGElement;
      expect(first.style.fill).toBe('var(--axon-chart-1)');
      expect(first.style.stroke).toBe('var(--axon-chart-1)');
      expect(first.style.fillOpacity).toBe('0.3');
      expect((areas(container)[1] as SVGElement).style.fill).toBe('var(--axon-chart-2)');
    });

    it('puts a dot on every corner, unless turned off', () => {
      const { container, rerender } = renderChart();
      expect(container.querySelectorAll('circle.axon-chart__dot')).toHaveLength(8);
      rerender(
        <RadarChart data={data} axisKey="skill" series={series} dots={false} animate={false} />,
      );
      expect(container.querySelectorAll('circle.axon-chart__dot')).toHaveLength(0);
    });

    it('can fix the outer ring, and the centre', () => {
      const { container } = renderChart({ max: 200, min: 0 });
      const radii = corners(areas(container)[0]!).map(distance);
      const small = radii[0]!;
      const { container: normal } = render(
        <RadarChart data={data} axisKey="skill" series={series} animate={false} />,
      );
      expect(small).toBeLessThan(corners(areas(normal)[0]!).map(distance)[0]!);
    });

    it('can draw more rings, and labels the values on them', () => {
      const { container, rerender } = renderChart({ levels: 2 });
      const few = rings(container).length;
      rerender(
        <RadarChart data={data} axisKey="skill" series={series} levels={8} animate={false} />,
      );
      expect(rings(container).length).toBeGreaterThan(few);
      expect(
        [...container.querySelectorAll('text.axon-chart__tick-label')].map((el) => el.textContent),
      ).toContain('20');
    });
  });

  describe('the legend', () => {
    it('hides a series and the shape goes', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.click(screen.getByRole('button', { name: 'Target' }));
      expect(areas(container)).toHaveLength(1);
      expect(chart().getAttribute('aria-label')).not.toMatch(/Target/);
    });

    it('rescales to the series that are left', async () => {
      const user = userEvent.setup();
      const { container } = renderChart({
        data: [
          { skill: 'A', current: 10, target: 100 },
          { skill: 'B', current: 8, target: 90 },
          { skill: 'C', current: 6, target: 80 },
        ],
      });
      const before = distance(corners(areas(container)[0]!)[0]!);
      await user.click(screen.getByRole('button', { name: 'Target' }));
      expect(distance(corners(areas(container)[0]!)[0]!)).toBeGreaterThan(before);
    });

    it('is left out for one series, and dims the others when one item is pointed at', async () => {
      const user = userEvent.setup();
      const { container, rerender } = renderChart();
      await user.hover(screen.getByRole('button', { name: 'Current' }));
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(1);
      rerender(<RadarChart data={data} axisKey="skill" series={[series[0]!]} animate={false} />);
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
    });
  });

  describe('reading it', () => {
    it('shows the values on the spoke nearest the pointer', () => {
      const { container } = renderChart();
      // The third axis is a third of the way round: 180 degrees (straight down) for 4 axes it is axis 2.
      pointerAtAngle(container, 180);
      const box = tooltipOf(container)!;
      expect(box).toHaveTextContent('Backend');
      expect(within(box).getByText('Current').nextSibling).toHaveTextContent('60');
      expect(within(box).getByText('Target').nextSibling).toHaveTextContent('80');
      expect(container.querySelector('.axon-chart__radar-spoke--active')).not.toBeNull();
    });

    it('picks the spoke by angle, not by distance', () => {
      const { container } = renderChart();
      pointerAtAngle(container, 95, 20);
      expect(tooltipOf(container)).toHaveTextContent('Frontend');
      pointerAtAngle(container, 350, 150);
      expect(tooltipOf(container)).toHaveTextContent('Design');
      pointerAtAngle(container, 355, 150);
      expect(tooltipOf(container)).toHaveTextContent('Design');
    });

    it('goes away when the pointer leaves, and can be turned off', () => {
      const { container, rerender } = renderChart();
      pointerAtAngle(container, 0);
      fireEvent.pointerLeave(container.querySelector('.axon-chart__hit')!);
      expect(tooltipOf(container)).toBeNull();
      rerender(
        <RadarChart data={data} axisKey="skill" series={series} tooltip={false} animate={false} />,
      );
      pointerAtAngle(container, 0);
      expect(tooltipOf(container)).toBeNull();
    });

    it('steps round the axes with the keyboard, going round past the last', async () => {
      const user = userEvent.setup();
      renderChart();
      chart().focus();
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Design: Current 70, Target 80');
      await user.keyboard('{ArrowLeft}');
      expect(liveRegion()).toHaveTextContent('Testing:');
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Design:');
      await user.keyboard('{End}');
      expect(liveRegion()).toHaveTextContent('Testing:');
      await user.keyboard('{Home}');
      expect(liveRegion()).toHaveTextContent('Design:');
    });

    it('lets go with Escape, and chooses an axis with Enter', async () => {
      const user = userEvent.setup();
      const onPointClick = vi.fn();
      const { container } = renderChart({ onPointClick });
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      expect(onPointClick).toHaveBeenCalledWith(data[1], 1);
      await user.keyboard('{Escape}');
      expect(tooltipOf(container)).toBeNull();
    });

    it('calls onPointClick when an axis is pressed', () => {
      const onPointClick = vi.fn();
      const { container } = renderChart({ onPointClick });
      pointerAtAngle(container, 270);
      fireEvent.click(container.querySelector('.axon-chart__hit')!);
      expect(onPointClick).toHaveBeenCalledWith(data[3], 3);
    });
  });

  it('has a hidden table of every axis and series', () => {
    renderChart({ title: 'Skills' });
    const table = screen.getByRole('table', { name: 'Data for Skills' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['skill', 'Current', 'Target']);
    expect(within(table).getAllByRole('row')).toHaveLength(5);
  });

  it('shows loading and empty states', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<RadarChart data={[]} axisKey="skill" series={series} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('copes with one and two axes', () => {
    for (const rows of [data.slice(0, 1), data.slice(0, 2)]) {
      const { container, unmount } = renderChart({ data: rows });
      expect(container.innerHTML).not.toMatch(/NaN/);
      unmount();
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = renderChart({ title: 'Skills' });
    expect(await axe(container)).toHaveNoViolations();
    chart().focus();
    fireEvent.keyDown(chart(), { key: 'ArrowRight' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
