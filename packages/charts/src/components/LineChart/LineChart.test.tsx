import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineChart, linePath, type LineChartProps } from './LineChart';

const data = [
  { month: 'Jan', revenue: 100, costs: 60 },
  { month: 'Feb', revenue: 140, costs: 70 },
  { month: 'Mar', revenue: 120, costs: 90 },
  { month: 'Apr', revenue: 180, costs: 80 },
];
const series = [
  { key: 'revenue', name: 'Revenue' },
  { key: 'costs', name: 'Costs' },
];

function renderChart(props: Partial<LineChartProps> = {}) {
  return render(<LineChart data={data} xKey="month" series={series} {...props} />);
}

const chart = () => screen.getByRole('img');
const paths = (container: HTMLElement) => container.querySelectorAll('path.axon-chart__line');
const dots = (container: HTMLElement) =>
  container.querySelectorAll('circle.axon-chart__dot--static');
const live = () =>
  screen.getAllByRole('status').find((el) => el.getAttribute('aria-live') === 'polite')!;
const tooltip = (container: HTMLElement) => container.querySelector('.axon-chart-tooltip');
const tickLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('.axon-chart__tick-label')].map((el) => el.textContent);

/** The x and y of the plot's top left inside the svg, from its translate. */
function origin(container: HTMLElement) {
  const group = container.querySelector('svg > g')!;
  const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(group.getAttribute('transform') ?? '')!;
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Moves the pointer over the plot at the x of the n-th row, using where its dot was drawn. */
function pointAtRow(container: HTMLElement, row: number) {
  const dot = [...dots(container)][row]!;
  const { x, y } = origin(container);
  const hit = container.querySelector('.axon-chart__hit')!;
  fireEvent.pointerMove(hit, { clientX: x + Number(dot.getAttribute('cx')), clientY: y + 40 });
}

describe('LineChart', () => {
  describe('what it draws', () => {
    it('is one image named by a summary of the data', () => {
      renderChart();
      expect(chart().getAttribute('aria-label')).toBe(
        'Line chart with 2 series: Revenue, Costs. 4 data points from Jan to Apr. ' +
          'Revenue ranges from 100 at Jan to 180 at Apr. Costs ranges from 60 at Jan to 90 at Mar.',
      );
    });

    it('uses the title and description, and takes a label of your own', () => {
      const { rerender } = renderChart({
        title: 'Revenue and costs',
        description: 'Per month, in thousands',
      });
      expect(screen.getByText('Revenue and costs')).toBeInTheDocument();
      expect(screen.getByText('Per month, in thousands')).toBeInTheDocument();
      expect(chart().getAttribute('aria-label')).toMatch(/^Revenue and costs\. Line chart/);
      expect(chart().getAttribute('aria-label')).toMatch(/Per month, in thousands.$/);
      expect(screen.getByRole('figure')).toHaveAccessibleName(
        'Revenue and costs Per month, in thousands',
      );
      rerender(<LineChart data={data} xKey="month" series={series} ariaLabel="Custom summary" />);
      expect(chart()).toHaveAttribute('aria-label', 'Custom summary');
    });

    it('draws a line for each series, in the palette colours or your own', () => {
      const { container } = renderChart({
        series: [{ key: 'revenue' }, { key: 'costs', color: 'rebeccapurple' }],
      });
      const lines = paths(container);
      expect(lines).toHaveLength(2);
      expect((lines[0] as SVGElement).style.stroke).toBe('var(--axon-chart-1)');
      expect((lines[1] as SVGElement).style.stroke).toBe('rebeccapurple');
    });

    it('labels the x axis with the categories and the y axis with nice numbers', () => {
      const { container } = renderChart();
      const labels = tickLabels(container);
      expect(labels).toEqual(expect.arrayContaining(['Jan', 'Feb', 'Mar', 'Apr']));
      expect(labels).toEqual(expect.arrayContaining(['60', '100', '140', '180']));
    });

    it('can show axis titles, format ticks, and hide an axis', () => {
      const { container, rerender } = renderChart({
        xAxis: { label: 'Month' },
        yAxis: { label: 'Thousands', tickFormat: '$,.0f' },
      });
      const titles = [...container.querySelectorAll('.axon-chart__axis-title')].map(
        (el) => el.textContent,
      );
      expect(titles).toEqual(expect.arrayContaining(['Month', 'Thousands']));
      expect(tickLabels(container)).toContain('$100');
      rerender(<LineChart data={data} xKey="month" series={series} xAxis={false} yAxis={false} />);
      expect(container.querySelectorAll('.axon-chart__tick-label')).toHaveLength(0);
    });

    it('draws horizontal grid lines by default, and vertical ones on request', () => {
      const { container, rerender } = renderChart();
      const grid = () => container.querySelectorAll('.axon-chart__grid-line').length;
      const withDefault = grid();
      expect(withDefault).toBeGreaterThan(0);
      rerender(<LineChart data={data} xKey="month" series={series} xAxis={{ grid: true }} />);
      expect(grid()).toBeGreaterThan(withDefault);
      rerender(<LineChart data={data} xKey="month" series={series} yAxis={{ grid: false }} />);
      expect(grid()).toBe(0);
    });

    it('puts dots on the points of a short chart, and not on a long one', () => {
      const { container, rerender } = renderChart();
      expect(dots(container)).toHaveLength(8);
      rerender(<LineChart data={data} xKey="month" series={series} dots={false} />);
      expect(dots(container)).toHaveLength(0);
      const long = Array.from({ length: 31 }, (_, i) => ({ n: i, v: i }));
      rerender(<LineChart data={long} xKey="n" series={[{ key: 'v' }]} />);
      expect(dots(container)).toHaveLength(0);
      rerender(<LineChart data={long} xKey="n" series={[{ key: 'v' }]} dots />);
      expect(dots(container)).toHaveLength(31);
    });

    it('breaks the line at a missing value, or draws across it', () => {
      const gappy = [
        { x: 'a', v: 1 },
        { x: 'b', v: null },
        { x: 'c', v: 3 },
      ];
      const { container, rerender } = render(
        <LineChart data={gappy} xKey="x" series={[{ key: 'v' }]} dots={false} />,
      );
      const subpaths = (el: Element) => (el.getAttribute('d')!.match(/M/g) ?? []).length;
      expect(subpaths(paths(container)[0]!)).toBe(2);
      rerender(
        <LineChart data={gappy} xKey="x" series={[{ key: 'v' }]} dots={false} connectNulls />,
      );
      expect(subpaths(paths(container)[0]!)).toBe(1);
    });

    it('can curve and step', () => {
      const { container, rerender } = renderChart({ series: [series[0]!], curve: 'monotone' });
      expect(paths(container)[0]!.getAttribute('d')).toMatch(/C/);
      rerender(<LineChart data={data} xKey="month" series={[series[0]!]} curve="step" />);
      const stepped = paths(container)[0]!.getAttribute('d')!;
      expect(stepped).not.toMatch(/C/);
      // A step runs flat, then straight up or down: more segments than there are points.
      expect(stepped.split('L').length - 1).toBeGreaterThan(data.length);
    });

    it('can fix the ends of the y axis, or start it at zero', () => {
      const { container, rerender } = renderChart({ series: [series[0]!], yMin: 0, yMax: 400 });
      expect(tickLabels(container)).toEqual(expect.arrayContaining(['0', '400']));
      rerender(<LineChart data={data} xKey="month" series={[series[0]!]} includeZero />);
      expect(tickLabels(container)).toContain('0');
    });

    it('draws numbers and dates along a scaled axis, in order', () => {
      const unsorted = [
        { year: 2022, v: 3 },
        { year: 2020, v: 1 },
        { year: 2021, v: 2 },
      ];
      const { container } = render(
        <LineChart data={unsorted} xKey="year" series={[{ key: 'v' }]} />,
      );
      expect(chart().getAttribute('aria-label')).toMatch(/from 2020 to 2022/);
      const rows = [...container.querySelectorAll('tbody th')].map((el) => el.textContent);
      expect(rows).toEqual(['2020', '2021', '2022']);
    });

    it('reads dates', () => {
      const dated = [
        { when: new Date(2024, 0, 1), v: 1 },
        { when: new Date(2024, 5, 1), v: 5 },
      ];
      render(<LineChart data={dated} xKey="when" series={[{ key: 'v' }]} locale="en-US" />);
      expect(chart().getAttribute('aria-label')).toMatch(/from .*2024.* to .*2024/);
    });

    it('takes a fixed width, and follows the container when it is resized', () => {
      const { container, unmount } = renderChart({ width: 320 });
      expect(container.querySelector('svg')).toHaveAttribute('width', '320');
      unmount();

      let notify: ResizeObserverCallback = () => {};
      const original = globalThis.ResizeObserver;
      globalThis.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as never;
      try {
        const view = renderChart();
        expect(view.container.querySelector('svg')).toHaveAttribute('width', '600');
        // The observer reports the new width, as a browser would.
        act(() => {
          notify([{ contentRect: { width: 420 } } as ResizeObserverEntry], {} as ResizeObserver);
        });
        expect(view.container.querySelector('svg')).toHaveAttribute('width', '420');
      } finally {
        globalThis.ResizeObserver = original;
      }
    });
  });

  describe('the legend', () => {
    it('lists the series as buttons, all showing', () => {
      renderChart();
      const legend = screen.getByRole('list', { name: 'Legend' });
      const buttons = within(legend).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual(['Revenue', 'Costs']);
      for (const button of buttons) expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('hides and shows a series, and the axis follows what is left', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      const before = tickLabels(container);
      await user.click(screen.getByRole('button', { name: 'Costs' }));
      expect(screen.getByRole('button', { name: 'Costs' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(paths(container)).toHaveLength(1);
      expect(tickLabels(container)).not.toEqual(before);
      expect(chart().getAttribute('aria-label')).toMatch(/1 series: Revenue/);
      expect(chart().getAttribute('aria-label')).not.toMatch(/Costs/);
      await user.click(screen.getByRole('button', { name: 'Costs' }));
      expect(paths(container)).toHaveLength(2);
      expect(tickLabels(container)).toEqual(before);
    });

    it('keeps each series its own colour while another is hidden', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.click(screen.getByRole('button', { name: 'Revenue' }));
      expect((paths(container)[0] as SVGElement).style.stroke).toBe('var(--axon-chart-2)');
    });

    it('can start with series hidden', () => {
      const { container } = renderChart({ defaultHiddenSeries: ['costs'] });
      expect(paths(container)).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Costs' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('can be controlled', async () => {
      const user = userEvent.setup();
      const onHiddenSeriesChange = vi.fn();
      const { container, rerender } = renderChart({ hiddenSeries: [], onHiddenSeriesChange });
      await user.click(screen.getByRole('button', { name: 'Costs' }));
      expect(onHiddenSeriesChange).toHaveBeenCalledWith(['costs']);
      expect(paths(container)).toHaveLength(2);
      rerender(
        <LineChart
          data={data}
          xKey="month"
          series={series}
          hiddenSeries={['costs']}
          onHiddenSeriesChange={onHiddenSeriesChange}
        />,
      );
      expect(paths(container)).toHaveLength(1);
    });

    it('is left out for a single series, or when turned off, and can go on top', () => {
      const { rerender, container } = renderChart({ series: [series[0]!] });
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
      rerender(<LineChart data={data} xKey="month" series={series} legend={false} />);
      expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
      rerender(<LineChart data={data} xKey="month" series={series} legend="top" />);
      const figure = container.querySelector('figure')!;
      const children = [...figure.children];
      expect(children.indexOf(screen.getByRole('list', { name: 'Legend' }))).toBeLessThan(
        children.indexOf(container.querySelector('.axon-chart__plot')!),
      );
    });

    it('dims the other lines while one legend item is pointed at', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.hover(screen.getByRole('button', { name: 'Costs' }));
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(1);
      await user.unhover(screen.getByRole('button', { name: 'Costs' }));
      expect(container.querySelectorAll('.axon-chart__dimmed')).toHaveLength(0);
    });

    it('can be translated', () => {
      renderChart({ labels: { legend: 'Leyenda' } });
      expect(screen.getByRole('list', { name: 'Leyenda' })).toBeInTheDocument();
    });
  });

  describe('the tooltip', () => {
    it('follows the pointer and shows every series at the row it is nearest', () => {
      const { container } = renderChart();
      expect(tooltip(container)).toBeNull();
      pointAtRow(container, 1);
      const box = tooltip(container)!;
      expect(box).toHaveTextContent('Feb');
      expect(within(box as HTMLElement).getByText('Revenue').nextSibling).toHaveTextContent('140');
      expect(within(box as HTMLElement).getByText('Costs').nextSibling).toHaveTextContent('70');
      pointAtRow(container, 3);
      expect(tooltip(container)).toHaveTextContent('Apr');
      expect(tooltip(container)).toHaveTextContent('180');
    });

    it('shows a guide line and a larger dot on each series at that row', () => {
      const { container } = renderChart();
      pointAtRow(container, 2);
      expect(container.querySelector('.axon-chart__crosshair')).not.toBeNull();
      expect(
        container.querySelectorAll('circle.axon-chart__dot:not(.axon-chart__dot--static)'),
      ).toHaveLength(2);
    });

    it('goes away when the pointer leaves', () => {
      const { container } = renderChart();
      pointAtRow(container, 1);
      fireEvent.pointerLeave(container.querySelector('.axon-chart__hit')!);
      expect(tooltip(container)).toBeNull();
      expect(container.querySelector('.axon-chart__crosshair')).toBeNull();
    });

    it('formats values with valueFormat', () => {
      const { container } = renderChart({ valueFormat: '$,.0f' });
      pointAtRow(container, 1);
      expect(tooltip(container)).toHaveTextContent('$140');
    });

    it('is hidden from assistive technology, and can be turned off', () => {
      const { container, rerender } = renderChart();
      pointAtRow(container, 1);
      expect(tooltip(container)).toHaveAttribute('aria-hidden', 'true');
      rerender(<LineChart data={data} xKey="month" series={series} tooltip={false} />);
      expect(tooltip(container)).toBeNull();
    });

    it('shows only the series that are showing', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      await user.click(screen.getByRole('button', { name: 'Costs' }));
      pointAtRow(container, 1);
      expect(tooltip(container)).toHaveTextContent('Revenue');
      expect(tooltip(container)).not.toHaveTextContent('Costs');
    });

    it('calls onPointClick with the row that was pressed', () => {
      const onPointClick = vi.fn();
      const { container } = renderChart({ onPointClick });
      pointAtRow(container, 2);
      fireEvent.click(container.querySelector('.axon-chart__hit')!);
      expect(onPointClick).toHaveBeenCalledWith(data[2], 2);
    });
  });

  describe('the keyboard', () => {
    it('takes focus, and explains the keys', () => {
      renderChart();
      expect(chart()).toHaveAttribute('tabindex', '0');
      expect(chart()).toHaveAccessibleDescription(/arrow keys/);
    });

    it('steps through the rows, showing the tooltip and announcing each row', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      chart().focus();
      expect(live()).toBeEmptyDOMElement();
      await user.keyboard('{ArrowRight}');
      expect(live()).toHaveTextContent('Jan: Revenue 100, Costs 60');
      expect(tooltip(container)).toHaveTextContent('Jan');
      await user.keyboard('{ArrowRight}');
      expect(live()).toHaveTextContent('Feb: Revenue 140, Costs 70');
      await user.keyboard('{ArrowLeft}');
      expect(live()).toHaveTextContent('Jan:');
      await user.keyboard('{ArrowLeft}');
      expect(live()).toHaveTextContent('Jan:');
    });

    it('jumps to the ends with Home and End, and starts from the end with ArrowLeft', async () => {
      const user = userEvent.setup();
      renderChart();
      chart().focus();
      await user.keyboard('{End}');
      expect(live()).toHaveTextContent('Apr:');
      await user.keyboard('{ArrowRight}');
      expect(live()).toHaveTextContent('Apr:');
      await user.keyboard('{Home}');
      expect(live()).toHaveTextContent('Jan:');
    });

    it('starts from the last row with ArrowLeft', async () => {
      const user = userEvent.setup();
      renderChart();
      chart().focus();
      await user.keyboard('{ArrowLeft}');
      expect(live()).toHaveTextContent('Apr:');
    });

    it('lets go with Escape and when focus leaves', async () => {
      const user = userEvent.setup();
      const { container } = renderChart();
      chart().focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Escape}');
      expect(tooltip(container)).toBeNull();
      expect(live()).toBeEmptyDOMElement();
      await user.keyboard('{ArrowRight}');
      expect(tooltip(container)).not.toBeNull();
      await user.tab();
      expect(tooltip(container)).toBeNull();
    });

    it('chooses a row with Enter', async () => {
      const user = userEvent.setup();
      const onPointClick = vi.fn();
      renderChart({ onPointClick });
      chart().focus();
      await user.keyboard('{Enter}');
      expect(onPointClick).not.toHaveBeenCalled();
      await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      expect(onPointClick).toHaveBeenCalledWith(data[1], 1);
    });

    it('does not announce while the pointer is used', () => {
      const { container } = renderChart();
      pointAtRow(container, 1);
      expect(live()).toBeEmptyDOMElement();
    });
  });

  describe('for people who cannot see it', () => {
    it('has a hidden table of the data, with every series', () => {
      renderChart({ title: 'Revenue' });
      const table = screen.getByRole('table', { name: 'Data for Revenue' });
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((h) => h.textContent),
      ).toEqual(['month', 'Revenue', 'Costs']);
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(5);
      expect(
        within(rows[2]!)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual(['140', '70']);
      expect(within(rows[2]!).getByRole('rowheader')).toHaveTextContent('Feb');
    });

    it('keeps hidden series in the table', async () => {
      const user = userEvent.setup();
      renderChart();
      await user.click(screen.getByRole('button', { name: 'Costs' }));
      expect(screen.getByRole('columnheader', { name: 'Costs' })).toBeInTheDocument();
    });

    it('can be left out, forced, or left to decide by size', () => {
      const big = Array.from({ length: 60 }, (_, i) => ({ n: String(i), v: i }));
      const { rerender } = renderChart({ dataTable: false });
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      rerender(<LineChart data={big} xKey="n" series={[{ key: 'v' }]} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      rerender(<LineChart data={big} xKey="n" series={[{ key: 'v' }]} dataTable />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('can be translated', () => {
      renderChart({ labels: { keyboardHint: 'Usa las flechas.', dataTable: () => 'Datos' } });
      expect(chart()).toHaveAccessibleDescription('Usa las flechas.');
      expect(screen.getByRole('table', { name: 'Datos' })).toBeInTheDocument();
    });
  });

  describe('loading, empty and motion', () => {
    it('shows a placeholder while loading, and no chart', () => {
      const { container } = renderChart({ loading: true });
      expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true');
    });

    it('says when there is no data, or shows your own message', () => {
      const { rerender } = render(<LineChart data={[]} xKey="month" series={series} />);
      expect(screen.getByText('No data to display')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      rerender(
        <LineChart data={[]} xKey="month" series={series} emptyState={<p>Nothing yet</p>} />,
      );
      expect(screen.getByText('Nothing yet')).toBeInTheDocument();
      expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
    });

    it('animates unless told not to', () => {
      const { container, rerender } = renderChart();
      expect(container.querySelector('figure')).toHaveClass('axon-chart--animate');
      rerender(<LineChart data={data} xKey="month" series={series} animate={false} />);
      expect(container.querySelector('figure')).not.toHaveClass('axon-chart--animate');
    });

    describe('with reduced motion', () => {
      const original = window.matchMedia;
      afterEach(() => {
        window.matchMedia = original;
      });

      it('never animates', () => {
        window.matchMedia = ((query: string) => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        })) as never;
        const { container } = renderChart();
        expect(container.querySelector('figure')).not.toHaveClass('axon-chart--animate');
      });
    });
  });

  it('forwards a class name and style', () => {
    const { container } = renderChart({ className: 'mine', style: { margin: 4 } });
    expect(container.querySelector('figure')).toHaveClass('axon-chart', 'axon-chart--line', 'mine');
    expect(container.querySelector('figure')).toHaveStyle({ margin: '4px' });
  });

  it('has no accessibility violations: showing, with a tooltip, loading and empty', async () => {
    const { container, rerender } = renderChart({ title: 'Revenue' });
    expect(await axe(container)).toHaveNoViolations();
    pointAtRow(container, 1);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<LineChart data={data} xKey="month" series={series} loading />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<LineChart data={[]} xKey="month" series={series} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('linePath', () => {
  const context = {
    width: 100,
    height: 100,
    horizontal: false,
    category: {} as never,
    value: { position: (v: number) => 100 - v } as never,
    data: [{ v: 10 }, { v: 50 }, { v: 90 }],
    xKey: 'x',
    positions: [0, 50, 100],
    series: [],
    highlighted: null,
    animate: false,
  };

  it('joins the points with straight lines by default', () => {
    expect(linePath(context, 'v', 'linear', false)).toBe('M0,90L50,50L100,10');
  });

  it('gives nothing for a series with no values', () => {
    expect(linePath({ ...context, data: [{ v: null }] }, 'v', 'linear', false)).toBeNull();
  });
});
