import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import {
  bars,
  boxOf,
  liveRegion,
  plotOrigin,
  pointAt,
  tickLabels,
  tooltipOf,
} from '../../testing/chartTestUtils';
import { BarChart, type BarChartProps } from './BarChart';

const data = [
  { quarter: 'Q1', north: 100, south: 50, east: 25 },
  { quarter: 'Q2', north: 200, south: 80, east: 40 },
  { quarter: 'Q3', north: 150, south: 60, east: 90 },
];
const series = [
  { key: 'north', name: 'North' },
  { key: 'south', name: 'South' },
];

function renderChart(props: Partial<BarChartProps> = {}) {
  return render(
    <BarChart
      data={data}
      xKey="quarter"
      series={series}
      barRadius={0}
      animate={false}
      {...props}
    />,
  );
}

describe('BarChart', () => {
  describe('vertical, grouped', () => {
    it('is one image named by a summary', () => {
      renderChart();
      const label = screen.getByRole('img').getAttribute('aria-label')!;
      expect(label).toMatch(
        /^Bar chart with 2 series: North, South\. 3 data points from Q1 to Q3\./,
      );
    });

    it('draws a bar for each series in each row', () => {
      const { container } = renderChart();
      expect(bars(container)).toHaveLength(6);
    });

    it('stands the bars on the baseline, tall in proportion to their value', () => {
      const { container } = renderChart();
      // Bars are drawn series by series: North in Q1, Q2, Q3, then South.
      const [northQ1, northQ2, northQ3, southQ1] = bars(container).map(boxOf) as ReturnType<
        typeof boxOf
      >[] as [
        ReturnType<typeof boxOf>,
        ReturnType<typeof boxOf>,
        ReturnType<typeof boxOf>,
        ReturnType<typeof boxOf>,
      ];
      // Every bar rests on the same line.
      expect(northQ1.y + northQ1.height).toBeCloseTo(southQ1.y + southQ1.height, 5);
      // Twice the value, twice the height; the value axis starts at 0.
      expect(northQ2.height / northQ1.height).toBeCloseTo(2, 5);
      expect(northQ3.height / northQ1.height).toBeCloseTo(1.5, 5);
      expect(northQ1.height / southQ1.height).toBeCloseTo(2, 5);
    });

    it('puts the bars of a group side by side, in order, and the groups in order', () => {
      const { container } = renderChart();
      const boxes = bars(container).map(boxOf);
      const [northQ1, northQ2] = [boxes[0]!, boxes[1]!];
      const southQ1 = boxes[3]!;
      expect(southQ1.x).toBeGreaterThan(northQ1.x + northQ1.width - 1e-6);
      expect(southQ1.x + southQ1.width).toBeLessThan(northQ2.x);
      expect(northQ1.width).toBeCloseTo(southQ1.width, 5);
    });

    it('always starts the value axis at zero', () => {
      const { container } = renderChart({
        data: [
          { quarter: 'Q1', north: 1000 },
          { quarter: 'Q2', north: 1010 },
        ],
        series: [{ key: 'north' }],
      });
      expect(tickLabels(container)).toContain('0');
    });

    it('labels the categories under the bars and the values on the left', () => {
      const { container } = renderChart();
      expect(tickLabels(container)).toEqual(
        expect.arrayContaining(['Q1', 'Q2', 'Q3', '0', '100', '200']),
      );
    });

    it('draws bars in the palette colours', () => {
      const { container } = renderChart();
      expect((bars(container)[0] as SVGElement).style.fill).toBe('var(--axon-chart-1)');
      expect((bars(container)[3] as SVGElement).style.fill).toBe('var(--axon-chart-2)');
    });

    it('rounds the free end of a bar, and leaves the end on the baseline square', () => {
      const { container } = renderChart({ barRadius: 6 });
      const d = bars(container)[0]!.getAttribute('d')!;
      expect(d).toMatch(/Q/);
      const none = renderChart({ barRadius: 0 });
      expect(bars(none.container)[0]!.getAttribute('d')).not.toMatch(/Q/);
    });

    it('can hold bars to a maximum thickness', () => {
      const wide = boxOf(bars(renderChart().container)[0]!);
      const thin = boxOf(bars(renderChart({ maxBarSize: 10 }).container)[0]!);
      expect(wide.width).toBeGreaterThan(10);
      expect(thin.width).toBe(10);
    });

    it('writes each value at the end of its bar when asked', () => {
      const { container } = renderChart({ showValues: true, valueFormat: '$,.0f' });
      const labels = [...container.querySelectorAll('.axon-chart__value-label')].map(
        (el) => el.textContent,
      );
      expect(labels).toEqual(['$100', '$200', '$150', '$50', '$80', '$60']);
    });

    it('draws bars for negative values below the baseline', () => {
      const { container } = renderChart({
        data: [
          { quarter: 'Q1', north: 100 },
          { quarter: 'Q2', north: -50 },
        ],
        series: [{ key: 'north' }],
      });
      const [up, down] = bars(container).map(boxOf) as [
        ReturnType<typeof boxOf>,
        ReturnType<typeof boxOf>,
      ];
      expect(down.y).toBeCloseTo(up.y + up.height, 5);
      expect(tickLabels(container)).toContain('−50');
    });
  });

  describe('horizontal', () => {
    it('lies the bars along the axis, categories down the left and values along the bottom', () => {
      const { container } = renderChart({ orientation: 'horizontal' });
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Horizontal bar chart/);
      const boxes = bars(container).map(boxOf);
      // All start at the baseline on the left, and each is as long as its value.
      expect(boxes[0]!.x).toBeCloseTo(boxes[3]!.x, 5);
      expect(boxes[1]!.width / boxes[0]!.width).toBeCloseTo(2, 5);
      // Groups run down the page, in order.
      expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
      expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
      expect(bars(container)[0]).toHaveClass('axon-chart__bar--horizontal');
      expect(container.querySelector('.axon-chart--bar-horizontal')).not.toBeNull();
    });

    it('keeps long category names readable by making room for them', () => {
      const { container } = renderChart({
        orientation: 'horizontal',
        data: [{ quarter: 'A rather long category name', north: 5 }],
        series: [{ key: 'north' }],
      });
      expect(plotOrigin(container).x).toBeGreaterThan(100);
    });

    it('steps through rows with the up and down arrows', async () => {
      const user = userEvent.setup();
      renderChart({ orientation: 'horizontal' });
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowDown}');
      expect(liveRegion()).toHaveTextContent('Q1:');
      await user.keyboard('{ArrowDown}');
      expect(liveRegion()).toHaveTextContent('Q2:');
      await user.keyboard('{ArrowUp}');
      expect(liveRegion()).toHaveTextContent('Q1:');
    });
  });

  describe('stacked', () => {
    it('stacks the series in a group on each other', () => {
      const { container } = renderChart({ stacked: true });
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Stacked bar chart/);
      const boxes = bars(container).map(boxOf);
      // Series order is north (first group's bar 1), south (bar 2) ... as drawn per series then row.
      const north = boxes.slice(0, 3);
      const south = boxes.slice(3, 6);
      for (let row = 0; row < 3; row += 1) {
        expect(south[row]!.x).toBeCloseTo(north[row]!.x, 5);
        // The south bar sits on top of the north bar.
        expect(south[row]!.y + south[row]!.height).toBeCloseTo(north[row]!.y, 5);
      }
    });

    it('makes the axis tall enough for the biggest stack', () => {
      const { container } = renderChart({ stacked: true });
      // The tallest stack is 280, so the axis reaches past it.
      expect(
        Math.max(
          ...tickLabels(container)
            .map((label) => Number(label))
            .filter(Number.isFinite),
        ),
      ).toBeGreaterThanOrEqual(280);
    });

    it('can make every stack 100% and label the axis in percent', () => {
      const { container } = renderChart({ stacked: 'percent' });
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^100% stacked bar chart/);
      expect(tickLabels(container)).toEqual(expect.arrayContaining(['0%', '100%']));
      const boxes = bars(container).map(boxOf);
      const north = boxes.slice(0, 3);
      const south = boxes.slice(3, 6);
      // With two series each stack is complete: the top of the upper bar is the top of the plot.
      const tops = north.map((n, i) => Math.min(n.y, south[i]!.y));
      expect(tops[0]).toBeCloseTo(tops[1]!, 5);
    });

    it('does not round stacked bars or write values on them', () => {
      const { container } = renderChart({ stacked: true, barRadius: 8, showValues: true });
      expect(bars(container)[0]!.getAttribute('d')).not.toMatch(/Q/);
      expect(container.querySelectorAll('.axon-chart__value-label')).toHaveLength(0);
    });

    it('keeps real values in the tooltip, not shares', () => {
      const { container } = renderChart({ stacked: 'percent' });
      screen.getByRole('img').focus();
      fireEvent.keyDown(screen.getByRole('img'), { key: 'ArrowRight' });
      expect(tooltipOf(container)).toHaveTextContent('100');
      expect(tooltipOf(container)).toHaveTextContent('50');
    });

    it('stacks negative values downwards from the baseline', () => {
      const { container } = renderChart({
        stacked: true,
        data: [{ quarter: 'Q1', north: 100, south: -40 }],
      });
      const [up, down] = bars(container).map(boxOf) as [
        ReturnType<typeof boxOf>,
        ReturnType<typeof boxOf>,
      ];
      expect(down.y).toBeCloseTo(up.y + up.height, 5);
    });
  });

  describe('interaction', () => {
    it('highlights the band under the pointer and shows its values', () => {
      const { container } = renderChart();
      const northQ2 = boxOf(bars(container)[1]!);
      pointAt(container, northQ2.x + northQ2.width / 2);
      expect(container.querySelector('.axon-chart__cursor-band')).not.toBeNull();
      expect(tooltipOf(container)).toHaveTextContent('Q2');
      expect(within(tooltipOf(container)!).getByText('North').nextSibling).toHaveTextContent('200');
      expect(within(tooltipOf(container)!).getByText('South').nextSibling).toHaveTextContent('80');
    });

    it('steps through the groups with the keyboard', async () => {
      const user = userEvent.setup();
      renderChart();
      screen.getByRole('img').focus();
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Q2: North 200, South 80');
    });

    it('hides a series from the legend and widens the bars that are left', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      const before = boxOf(bars(container)[0]!).width;
      await user.click(screen.getByRole('button', { name: 'South' }));
      expect(bars(container)).toHaveLength(3);
      expect(boxOf(bars(container)[0]!).width).toBeGreaterThan(before);
    });

    it('calls onPointClick with the group that was pressed', () => {
      let picked: unknown;
      const { container } = renderChart({ onPointClick: (datum) => (picked = datum) });
      const northQ3 = boxOf(bars(container)[2]!);
      pointAt(container, northQ3.x + 1);
      fireEvent.click(container.querySelector('.axon-chart__hit')!);
      expect(picked).toEqual(data[2]);
    });
  });

  it('has a hidden data table with every series', () => {
    renderChart({ title: 'Sales' });
    const table = screen.getByRole('table', { name: 'Data for Sales' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['quarter', 'North', 'South']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('shows loading and empty states', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<BarChart data={[]} xKey="quarter" series={series} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('animates the bars unless told not to', () => {
    const { container, rerender } = render(<BarChart data={data} xKey="quarter" series={series} />);
    expect(container.querySelector('figure')).toHaveClass('axon-chart--animate');
    rerender(<BarChart data={data} xKey="quarter" series={series} animate={false} />);
    expect(container.querySelector('figure')).not.toHaveClass('axon-chart--animate');
  });

  it('has no accessibility violations in any arrangement', async () => {
    for (const props of [
      {},
      { orientation: 'horizontal' as const },
      { stacked: true },
      { showValues: true },
    ]) {
      const { container, unmount } = renderChart({ title: 'Sales', ...props });
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
