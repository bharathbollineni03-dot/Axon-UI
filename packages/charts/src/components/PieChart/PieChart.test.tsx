import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { liveRegion, tooltipOf } from '../../testing/chartTestUtils';
import { DonutChart, PieChart, type PieChartProps } from './PieChart';

const data = [
  { name: 'Chrome', value: 6480 },
  { name: 'Safari', value: 2290 },
  { name: 'Firefox', value: 780 },
  { name: 'Edge', value: 640 },
  { name: 'Other', value: 310 },
];

function renderChart(props: Partial<PieChartProps> = {}) {
  return render(<PieChart data={data} animate={false} {...props} />);
}

const slices = (container: HTMLElement) => [
  ...container.querySelectorAll('path.axon-chart__slice'),
];
const labelTexts = (container: HTMLElement) =>
  [...container.querySelectorAll('text.axon-chart__tick-label')].map((el) => el.textContent);
const chart = () => screen.getByRole('img');

describe('PieChart', () => {
  describe('what it draws', () => {
    it('draws a slice for each row, in the palette colours', () => {
      const { container } = renderChart();
      expect(slices(container)).toHaveLength(5);
      expect((slices(container)[0] as SVGElement).style.fill).toBe('var(--axon-chart-1)');
      expect((slices(container)[1] as SVGElement).style.fill).toBe('var(--axon-chart-2)');
    });

    it('is one image named by a summary with the biggest slices', () => {
      renderChart({ title: 'Browsers' });
      expect(chart().getAttribute('aria-label')).toBe(
        'Browsers. Pie chart with 5 slices totalling 10,500. ' +
          'Chrome 61.7% (6,480); Safari 21.8% (2,290); Firefox 7.4% (780); Edge 6.1% (640); and 1 more.',
      );
    });

    it('takes a label of your own', () => {
      renderChart({ ariaLabel: 'Custom' });
      expect(chart()).toHaveAttribute('aria-label', 'Custom');
    });

    it('can use your own colours: in order, or from the data', () => {
      const { container, rerender } = renderChart({ colors: ['red', 'green'] });
      expect((slices(container)[0] as SVGElement).style.fill).toBe('red');
      expect((slices(container)[1] as SVGElement).style.fill).toBe('green');
      expect((slices(container)[2] as SVGElement).style.fill).toBe('var(--axon-chart-3)');
      rerender(
        <PieChart
          data={data.map((row, i) => ({ ...row, tint: `#00${i}000` }))}
          colorKey="tint"
          animate={false}
        />,
      );
      expect((slices(container)[1] as SVGElement).style.fill).toBe('#001000');
    });

    it('reads other keys for the names and values', () => {
      const { container } = render(
        <PieChart
          data={[
            { browser: 'A', visits: 3 },
            { browser: 'B', visits: 1 },
          ]}
          nameKey="browser"
          valueKey="visits"
          animate={false}
        />,
      );
      expect(slices(container)).toHaveLength(2);
      expect(chart().getAttribute('aria-label')).toMatch(/A 75% \(3\); B 25% \(1\)/);
    });

    it('counts negative and missing values as zero, and draws nothing for them', () => {
      const { container } = renderChart({
        data: [
          { name: 'A', value: 5 },
          { name: 'B', value: -3 },
          { name: 'C', value: null },
          { name: 'D', value: 'x' },
        ],
      });
      expect(slices(container)).toHaveLength(1);
    });

    it('copes with two slices of the same name', () => {
      renderChart({
        data: [
          { name: 'Same', value: 1 },
          { name: 'Same', value: 2 },
        ],
      });
      expect(
        within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('button'),
      ).toHaveLength(2);
    });
  });

  describe('labels', () => {
    it('puts a label with a leader line beside each slice that is big enough', () => {
      const { container } = renderChart();
      // Other is under 3% of the total, so it is left unlabelled.
      expect(labelTexts(container)).toHaveLength(4);
      expect(labelTexts(container)).toEqual(
        expect.arrayContaining(['Chrome 61.7%', 'Safari 21.8%', 'Firefox 7.4%', 'Edge 6.1%']),
      );
      expect(container.querySelectorAll('polyline.axon-chart__leader')).toHaveLength(4);
    });

    it('leaves a very small slice unlabelled', () => {
      const { container } = renderChart({
        data: [
          { name: 'Big', value: 98 },
          { name: 'Tiny', value: 1 },
        ],
      });
      expect(labelTexts(container)).toEqual(['Big 99%']);
    });

    it('keeps labels apart', () => {
      const { container } = renderChart({
        data: Array.from({ length: 10 }, (_, i) => ({
          name: `Slice ${i}`,
          value: i === 0 ? 50 : 5,
        })),
      });
      const rightYs = [...container.querySelectorAll('text.axon-chart__tick-label')]
        .filter((el) => el.getAttribute('text-anchor') === 'start')
        .map((el) => Number(el.getAttribute('y')))
        .sort((a, b) => a - b);
      for (let i = 1; i < rightYs.length; i += 1) {
        expect(rightYs[i]! - rightYs[i - 1]!).toBeGreaterThanOrEqual(15 - 1e-6);
      }
    });

    it('can say just the name, the share or the value', () => {
      const { container, rerender } = renderChart({ sliceLabelContent: 'name' });
      expect(labelTexts(container)).toContain('Chrome');
      rerender(<PieChart data={data} animate={false} sliceLabelContent="percent" />);
      expect(labelTexts(container)).toContain('61.7%');
      rerender(<PieChart data={data} animate={false} sliceLabelContent="value" valueFormat="~s" />);
      expect(labelTexts(container)).toContain('6.48k');
    });

    it('can put the share inside the slices, or have no labels', () => {
      const { container, rerender } = renderChart({ sliceLabels: 'inside' });
      expect(container.querySelectorAll('.axon-chart__slice-label--inside').length).toBeGreaterThan(
        0,
      );
      expect(container.querySelectorAll('polyline')).toHaveLength(0);
      rerender(<PieChart data={data} animate={false} sliceLabels="none" />);
      expect(container.querySelectorAll('text.axon-chart__tick-label')).toHaveLength(0);
      expect(container.querySelectorAll('.axon-chart__slice-label--inside')).toHaveLength(0);
    });
  });

  describe('the legend', () => {
    it('lists every slice as a toggle', () => {
      renderChart();
      const buttons = within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual([
        'Chrome',
        'Safari',
        'Firefox',
        'Edge',
        'Other',
      ]);
      for (const button of buttons) expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('hides a slice and shares the whole between the others', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.click(screen.getByRole('button', { name: 'Chrome' }));
      expect(slices(container)).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'Chrome' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(chart().getAttribute('aria-label')).toMatch(
        /4 slices totalling 4,020\. Safari 57% \(2,290\)/,
      );
    });

    it('keeps a hidden slice in the data table, without a share', async () => {
      const user = userEvent.setup();
      renderChart();
      await user.click(screen.getByRole('button', { name: 'Chrome' }));
      const row = screen.getByRole('row', { name: /Chrome/ });
      expect(
        within(row)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual(['6,480', '–']);
    });

    it('can start with slices hidden, or be controlled', async () => {
      const user = userEvent.setup();
      const onHiddenSeriesChange = vi.fn();
      const { container, rerender } = renderChart({ defaultHiddenSeries: ['Other'] });
      expect(slices(container)).toHaveLength(4);
      rerender(
        <PieChart
          data={data}
          animate={false}
          hiddenSeries={[]}
          onHiddenSeriesChange={onHiddenSeriesChange}
        />,
      );
      expect(slices(container)).toHaveLength(5);
      await user.click(screen.getByRole('button', { name: 'Edge' }));
      expect(onHiddenSeriesChange).toHaveBeenCalledWith(['Edge']);
    });

    it('dims the other slices while one legend item is pointed at', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.hover(screen.getByRole('button', { name: 'Safari' }));
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(4);
    });

    it('can be left out, or put on top', () => {
      const { rerender } = renderChart({ legend: false });
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
      rerender(<PieChart data={[data[0]!]} animate={false} />);
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
    });
  });

  describe('reading it', () => {
    it('shows the name, value and share of the slice under the pointer, and pulls it out', () => {
      const { container } = renderChart();
      fireEvent.pointerMove(slices(container)[1]!, { clientX: 100, clientY: 100 });
      const box = tooltipOf(container)!;
      expect(box).toHaveTextContent('Safari');
      expect(within(box).getByText('Value').nextSibling).toHaveTextContent('2,290');
      expect(within(box).getByText('Share').nextSibling).toHaveTextContent('21.8%');
      expect(slices(container)[1]).toHaveAttribute('data-active', 'true');
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(4);
      fireEvent.pointerLeave(slices(container)[1]!);
      expect(tooltipOf(container)).toBeNull();
    });

    it('steps through the slices with the arrow keys and announces each', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      chart().focus();
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Chrome: 6,480 (61.7%)');
      expect(tooltipOf(container)).toHaveTextContent('Chrome');
      await user.keyboard('{ArrowRight}{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Firefox: 780 (7.4%)');
      await user.keyboard('{End}');
      expect(liveRegion()).toHaveTextContent('Other:');
      await user.keyboard('{Home}');
      expect(liveRegion()).toHaveTextContent('Chrome:');
      await user.keyboard('{Escape}');
      expect(tooltipOf(container)).toBeNull();
    });

    it('starts from the last slice with ArrowLeft', async () => {
      const user = userEvent.setup();
      renderChart();
      chart().focus();
      await user.keyboard('{ArrowLeft}');
      expect(liveRegion()).toHaveTextContent('Other:');
    });

    it('chooses a slice by pressing it, or Enter on the keyboard', async () => {
      const user = userEvent.setup();
      const onSliceClick = vi.fn();
      const { container } = renderChart({ onSliceClick });
      fireEvent.click(slices(container)[2]!);
      expect(onSliceClick).toHaveBeenLastCalledWith(data[2], 2);
      chart().focus();
      await user.keyboard('{ArrowRight}{Enter}');
      expect(onSliceClick).toHaveBeenLastCalledWith(data[0], 0);
    });

    it('does not announce while the pointer is used', () => {
      const { container } = renderChart();
      fireEvent.pointerMove(slices(container)[0]!, { clientX: 5, clientY: 5 });
      expect(liveRegion()).toBeEmptyDOMElement();
    });

    it('can turn the tooltip off', () => {
      const { container } = renderChart({ tooltip: false });
      fireEvent.pointerMove(slices(container)[0]!, { clientX: 5, clientY: 5 });
      expect(tooltipOf(container)).toBeNull();
    });
  });

  it('has a hidden data table with the share of each slice', () => {
    renderChart({ title: 'Browsers' });
    const table = screen.getByRole('table', { name: 'Data for Browsers' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Name', 'Value', 'Share']);
    const row = within(table).getByRole('row', { name: /Safari/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['2,290', '21.8%']);
  });

  it('shows loading and empty states, including when every value is zero', () => {
    const { rerender } = renderChart({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<PieChart data={[]} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    rerender(<PieChart data={[{ name: 'A', value: 0 }]} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('can be translated', () => {
    renderChart({ labels: { name: 'Navegador', value: 'Visitas', share: 'Parte' } });
    expect(screen.getByRole('columnheader', { name: 'Navegador' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Parte' })).toBeInTheDocument();
  });

  it('has no accessibility violations, with a slice active too', async () => {
    const { container } = renderChart({ title: 'Browsers' });
    expect(await axe(container)).toHaveNoViolations();
    chart().focus();
    fireEvent.keyDown(chart(), { key: 'ArrowRight' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('DonutChart', () => {
  const donut = (props: Partial<PieChartProps> = {}) =>
    render(<DonutChart data={data} animate={false} {...props} />);
  const centerValue = (container: HTMLElement) =>
    container.querySelector('.axon-chart__center-value');
  const centerLabel = (container: HTMLElement) =>
    container.querySelector('.axon-chart__center-label');

  it('is a ring with the total in the middle', () => {
    const { container } = donut();
    expect(chart().getAttribute('aria-label')).toMatch(/^Donut chart with 5 slices/);
    expect(container.querySelector('.axon-chart--donut')).not.toBeNull();
    expect(centerValue(container)).toHaveTextContent('10,500');
    expect(centerLabel(container)).toHaveTextContent('Total');
  });

  it('has a hole: the slices are rings, not wedges', () => {
    const { container } = donut();
    // A ring segment has an inner arc as well as an outer one; a wedge has only the outer.
    const arcs = (d: string) => (d.match(/A/g) ?? []).length;
    expect(arcs(slices(container)[0]!.getAttribute('d')!)).toBeGreaterThanOrEqual(2);
    const wedge = render(<PieChart data={data} animate={false} />);
    expect(arcs(slices(wedge.container)[0]!.getAttribute('d')!)).toBe(1);
  });

  it('shows the slice being looked at in the middle', async () => {
    const user = userEvent.setup();
    const { container } = donut();
    chart().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(centerValue(container)).toHaveTextContent('2,290');
    expect(centerLabel(container)).toHaveTextContent('Safari');
    await user.keyboard('{Escape}');
    expect(centerValue(container)).toHaveTextContent('10,500');
  });

  it('can change or hide the middle', () => {
    const { container, rerender } = donut({ centerLabel: 'Visits', centerValue: '10.5k' });
    expect(centerValue(container)).toHaveTextContent('10.5k');
    expect(centerLabel(container)).toHaveTextContent('Visits');
    rerender(<DonutChart data={data} animate={false} centerLabel={false} />);
    expect(centerValue(container)).toBeNull();
  });

  it('totals only the slices that are showing', async () => {
    const user = userEvent.setup();
    const { container } = donut();
    await user.click(screen.getByRole('button', { name: 'Chrome' }));
    expect(centerValue(container)).toHaveTextContent('4,020');
  });

  it('can have a bigger or smaller hole', () => {
    const { container } = donut({ innerRadius: 0.8 });
    expect(container.querySelector('.axon-chart--donut')).not.toBeNull();
    const pie = render(<PieChart data={data} animate={false} innerRadius={0} />);
    expect(pie.container.querySelector('.axon-chart--pie')).not.toBeNull();
    expect(pie.container.querySelector('.axon-chart__center-value')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = donut({ title: 'Browsers' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
