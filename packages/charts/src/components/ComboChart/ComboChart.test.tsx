import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import {
  bars,
  boxOf,
  liveRegion,
  pointAt,
  tickLabels,
  tooltipOf,
} from '../../testing/chartTestUtils';
import { ComboChart, type ComboChartProps } from './ComboChart';

const data = [
  { month: 'Jan', revenue: 1000, rate: 0.02 },
  { month: 'Feb', revenue: 1500, rate: 0.03 },
  { month: 'Mar', revenue: 1200, rate: 0.025 },
];
const series: ComboChartProps['series'] = [
  { key: 'revenue', name: 'Revenue', type: 'bar', format: '$,.0f' },
  { key: 'rate', name: 'Conversion', type: 'line', axis: 'right', format: '.1%' },
];

function renderChart(props: Partial<ComboChartProps> = {}) {
  return render(
    <ComboChart
      data={data}
      xKey="month"
      series={series}
      barRadius={0}
      animate={false}
      y2Axis={{ tickFormat: '.1%' }}
      {...props}
    />,
  );
}

const lines = (container: HTMLElement) => [
  ...container.querySelectorAll('path.axon-chart__line:not(.axon-chart__area-outline)'),
];
const rightAxis = (container: HTMLElement) => container.querySelector('.axon-chart__axis--right');
const leftAxis = (container: HTMLElement) => container.querySelector('.axon-chart__axis--left');
const labelsOf = (axis: Element | null) =>
  [...(axis?.querySelectorAll('.axon-chart__tick-label') ?? [])].map((el) => el.textContent);

describe('ComboChart', () => {
  it('draws bars and lines together', () => {
    const { container } = renderChart();
    expect(bars(container)).toHaveLength(3);
    expect(lines(container)).toHaveLength(1);
  });

  it('is one image named by a summary', () => {
    renderChart();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /^Combination chart with 2 series: Revenue, Conversion\./,
    );
  });

  it('measures series on the right-hand axis against its own scale', () => {
    const { container } = renderChart();
    expect(labelsOf(leftAxis(container))).toEqual(
      expect.arrayContaining(['0', '500', '1,000', '1,500']),
    );
    // The right axis is its own scale: a few percent, not thousands.
    expect(labelsOf(rightAxis(container))).toEqual(expect.arrayContaining(['2.0%', '3.0%']));
  });

  it('has no right-hand axis when no series uses it', () => {
    const { container } = renderChart({ series: [series[0]!, { key: 'rate', type: 'line' }] });
    expect(rightAxis(container)).toBeNull();
  });

  it('puts the line against the right-hand scale, not the bar scale', () => {
    const { container } = renderChart();
    // The conversion rate is tiny next to revenue: on the same axis the line would lie flat at the bottom.
    const d = lines(container)[0]!.getAttribute('d')!;
    const ys = [...d.matchAll(/[ML][-\d.e]+,([-\d.e]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(20);
  });

  it('can title both axes and hide the right one', () => {
    const { container, rerender } = renderChart({
      yAxis: { label: 'Revenue' },
      y2Axis: { label: 'Rate', tickFormat: '.1%' },
    });
    const titles = [...container.querySelectorAll('.axon-chart__axis-title')].map(
      (el) => el.textContent,
    );
    expect(titles).toEqual(expect.arrayContaining(['Revenue', 'Rate']));
    rerender(
      <ComboChart data={data} xKey="month" series={series} y2Axis={false} animate={false} />,
    );
    expect(rightAxis(container)).toBeNull();
  });

  it('shows each series in its own format in the tooltip', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();
    screen.getByRole('img').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(within(tooltipOf(container)!).getByText('Revenue').nextSibling).toHaveTextContent(
      '$1,500',
    );
    expect(within(tooltipOf(container)!).getByText('Conversion').nextSibling).toHaveTextContent(
      '3.0%',
    );
    expect(liveRegion()).toHaveTextContent('Feb: Revenue $1,500, Conversion 3.0%');
  });

  it('highlights the band of a bar under the pointer', () => {
    const { container } = renderChart();
    const box = boxOf(bars(container)[0]!);
    pointAt(container, box.x + box.width / 2);
    expect(container.querySelector('.axon-chart__cursor-band')).not.toBeNull();
    expect(tooltipOf(container)).toHaveTextContent('Jan');
  });

  it('draws larger dots on the lines at the row being looked at', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();
    screen.getByRole('img').focus();
    await user.keyboard('{ArrowRight}');
    expect(
      container.querySelectorAll('circle.axon-chart__dot:not(.axon-chart__dot--static)'),
    ).toHaveLength(1);
  });

  it('draws areas, and defaults a series to a bar', () => {
    const { container } = renderChart({
      series: [
        { key: 'revenue', type: 'area' },
        { key: 'rate', axis: 'right' },
      ],
    });
    expect(container.querySelectorAll('path.axon-chart__area')).toHaveLength(1);
    expect(bars(container)).toHaveLength(3);
  });

  it('can stack the bars', () => {
    const { container } = renderChart({
      data: [{ month: 'Jan', a: 10, b: 20 }],
      series: [
        { key: 'a', type: 'bar' },
        { key: 'b', type: 'bar' },
      ],
      y2Axis: undefined,
      stackedBars: true,
    });
    const [a, b] = bars(container).map(boxOf) as [
      ReturnType<typeof boxOf>,
      ReturnType<typeof boxOf>,
    ];
    expect(b.y + b.height).toBeCloseTo(a.y, 5);
  });

  it('uses a point axis when there are only lines', () => {
    const { container } = renderChart({
      series: [
        { key: 'revenue', type: 'line' },
        { key: 'rate', type: 'line', axis: 'right' },
      ],
    });
    expect(bars(container)).toHaveLength(0);
    expect(lines(container)).toHaveLength(2);
    expect(container.querySelector('.axon-chart__cursor-band')).toBeNull();
  });

  it('hides a series from the legend, and drops its axis when it was the only one on it', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();
    expect(rightAxis(container)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Conversion' }));
    expect(lines(container)).toHaveLength(0);
    expect(rightAxis(container)).toBeNull();
    expect(tickLabels(container)).toEqual(expect.arrayContaining(['Jan', 'Feb', 'Mar']));
  });

  it('has a hidden data table, formatted per series', () => {
    renderChart({ title: 'Funnel' });
    const table = screen.getByRole('table', { name: 'Data for Funnel' });
    const rows = within(table).getAllByRole('row');
    expect(
      within(rows[2]!)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['$1,500', '3.0%']);
  });

  it('shows loading and empty states', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<ComboChart data={[]} xKey="month" series={series} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderChart({ title: 'Funnel' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
