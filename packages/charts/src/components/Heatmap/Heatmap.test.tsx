import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { liveRegion, tooltipOf } from '../../testing/chartTestUtils';
import { Heatmap, type HeatmapProps } from './Heatmap';

const data = [
  { day: 'Mon', hour: '9am', merged: 2 },
  { day: 'Mon', hour: '11am', merged: 10 },
  { day: 'Mon', hour: '1pm', merged: 6 },
  { day: 'Tue', hour: '9am', merged: 0 },
  { day: 'Tue', hour: '11am', merged: 4 },
  { day: 'Wed', hour: '1pm', merged: 8 },
];

function renderMatrix(props: Partial<HeatmapProps> = {}) {
  return render(
    <Heatmap data={data} xKey="hour" yKey="day" valueKey="merged" animate={false} {...props} />,
  );
}

const cells = (container: HTMLElement) => [...container.querySelectorAll('rect.axon-chart__cell')];
const num = (el: Element, name: string) => Number(el.getAttribute(name));
const chart = () => screen.getByRole('img');
const opacity = (el: Element) => Number((el as SVGElement).style.fillOpacity);
const level = (el: Element) => Number(el.getAttribute('data-level'));

/** Moves the pointer over the middle of a cell. */
function pointAtCell(container: HTMLElement, cell: Element) {
  fireEvent.pointerMove(container.querySelector('.axon-chart__hit')!, {
    clientX: num(cell, 'x') + num(cell, 'width') / 2,
    clientY: num(cell, 'y') + num(cell, 'height') / 2,
  });
}

describe('Heatmap (categories)', () => {
  describe('the cells', () => {
    it('has a cell for every row and column, including the ones with no data', () => {
      const { container } = renderMatrix();
      // 3 days by 3 hours: six values, so three cells are empty.
      expect(cells(container)).toHaveLength(9);
      expect(container.querySelectorAll('.axon-chart__cell--empty')).toHaveLength(3);
    });

    it('lays them out in the order the categories appear, rows down and columns across', () => {
      const { container } = renderMatrix();
      const [mon9, mon11, mon1, tue9] = cells(container) as [Element, Element, Element, Element];
      expect(num(mon11, 'x')).toBeGreaterThan(num(mon9, 'x'));
      expect(num(mon1, 'x')).toBeGreaterThan(num(mon11, 'x'));
      expect(num(mon9, 'y')).toBe(num(mon11, 'y'));
      expect(num(tue9, 'y')).toBeGreaterThan(num(mon9, 'y'));
      expect(num(tue9, 'x')).toBe(num(mon9, 'x'));
    });

    it('shades bigger values more solidly, from faint to full', () => {
      const { container } = renderMatrix();
      const [mon9, mon11, , tue9] = cells(container) as [Element, Element, Element, Element];
      expect(opacity(mon11)).toBe(1);
      expect(opacity(mon9)).toBeGreaterThan(opacity(tue9));
      expect(opacity(mon11)).toBeGreaterThan(opacity(mon9));
      expect(level(tue9)).toBe(0);
      expect(level(mon11)).toBe(4);
    });

    it('uses the first palette colour, or the one you give', () => {
      const { container, rerender } = renderMatrix();
      expect((cells(container)[1] as SVGElement).style.fill).toBe('var(--axon-chart-1)');
      rerender(
        <Heatmap
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="merged"
          color="teal"
          animate={false}
        />,
      );
      expect((cells(container)[1] as SVGElement).style.fill).toBe('teal');
    });

    it('can have more or fewer shades', () => {
      const { container, rerender } = renderMatrix({ steps: 2 });
      expect(
        new Set(
          cells(container)
            .map(level)
            .filter((l) => l >= 0),
        ),
      ).toEqual(new Set([0, 1]));
      rerender(
        <Heatmap data={data} xKey="hour" yKey="day" valueKey="merged" steps={10} animate={false} />,
      );
      expect(Math.max(...cells(container).map(level))).toBe(9);
    });

    it('can fix the ends of the scale', () => {
      const { container } = renderMatrix({ domain: [0, 100] });
      // 10 out of 100 is in the lowest shade, not the highest.
      expect(level(cells(container)[1]!)).toBe(0);
    });

    it('can fix the order of the categories', () => {
      const { container } = renderMatrix({
        yOrder: ['Wed', 'Tue', 'Mon'],
        xOrder: ['1pm', '11am', '9am'],
      });
      const first = cells(container)[0] as Element;
      // The first cell is now Wed at 1pm: the one value Wed has.
      expect(level(first)).toBeGreaterThan(0);
      expect(cells(container)).toHaveLength(9);
    });

    it('writes the numbers in the cells when asked, if there is room', () => {
      const { container } = renderMatrix({ showValues: true });
      const values = [...container.querySelectorAll('.axon-chart__cell-value')].map(
        (el) => el.textContent,
      );
      expect(values).toEqual(['2', '10', '6', '0', '4', '8']);
    });

    it('labels the columns and rows, unless turned off', () => {
      const { container, rerender } = renderMatrix();
      const labels = () =>
        [...container.querySelectorAll('text.axon-chart__tick-label')].map((el) => el.textContent);
      expect(labels()).toEqual(expect.arrayContaining(['9am', '11am', '1pm', 'Mon', 'Tue', 'Wed']));
      rerender(
        <Heatmap
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="merged"
          xAxis={false}
          yAxis={false}
          animate={false}
        />,
      );
      expect(labels()).toEqual([]);
    });

    it('thins out labels that would crowd each other', () => {
      const many = Array.from({ length: 40 }, (_, i) => ({ x: `Week ${i + 1}`, y: 'A', value: i }));
      const { container } = render(<Heatmap data={many} animate={false} width={300} />);
      const labels = [...container.querySelectorAll('text.axon-chart__tick-label')].filter(
        (el) => el.getAttribute('text-anchor') === 'middle',
      );
      expect(labels.length).toBeLessThan(40);
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('describing it', () => {
    it('is one image named by a summary with the highest and lowest cells', () => {
      renderMatrix({ title: 'Merged PRs' });
      expect(chart().getAttribute('aria-label')).toBe(
        'Merged PRs. Heatmap of merged by day and hour: 3 rows, 3 columns. ' +
          'Highest 10 at Mon, 11am. Lowest 0 at Tue, 9am.',
      );
    });

    it('takes a label of your own', () => {
      renderMatrix({ ariaLabel: 'Custom' });
      expect(chart()).toHaveAttribute('aria-label', 'Custom');
    });

    it('has a hidden table with a row per category and a column per category', () => {
      renderMatrix({ title: 'Merged PRs' });
      const table = screen.getByRole('table', { name: 'Data for Merged PRs' });
      expect(
        within(table)
          .getAllByRole('columnheader')
          .map((h) => h.textContent),
      ).toEqual(['day', '9am', '11am', '1pm']);
      const mon = within(table).getByRole('row', { name: /Mon/ });
      expect(
        within(mon)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual(['2', '10', '6']);
      const wed = within(table).getByRole('row', { name: /Wed/ });
      expect(
        within(wed)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual(['–', '–', '8']);
    });

    it('shows a scale from less to more, which sighted users see and screen readers skip', () => {
      const { container, rerender } = renderMatrix();
      const scale = container.querySelector('.axon-heatmap-scale')!;
      expect(scale).toHaveAttribute('aria-hidden', 'true');
      expect(scale).toHaveTextContent('Less0');
      expect(scale).toHaveTextContent('10More');
      expect(scale.querySelectorAll('.axon-heatmap-scale__swatch')).toHaveLength(5);
      rerender(
        <Heatmap
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="merged"
          scale={false}
          animate={false}
        />,
      );
      expect(container.querySelector('.axon-heatmap-scale')).toBeNull();
    });

    it('can be translated', () => {
      const { container } = renderMatrix({ labels: { scaleLow: 'Menos', scaleHigh: 'Más' } });
      expect(container.querySelector('.axon-heatmap-scale')).toHaveTextContent('Menos');
      expect(container.querySelector('.axon-heatmap-scale')).toHaveTextContent('Más');
    });
  });

  describe('reading a cell', () => {
    it('shows the cell under the pointer, and rings it', () => {
      const { container } = renderMatrix();
      pointAtCell(container, cells(container)[1]!);
      const box = tooltipOf(container)!;
      expect(box).toHaveTextContent('Mon, 11am');
      expect(within(box).getByText('merged').nextSibling).toHaveTextContent('10');
      expect(container.querySelector('.axon-chart__cell-focus')).not.toBeNull();
    });

    it('says "No data" for a cell with nothing in it', () => {
      const { container } = renderMatrix();
      pointAtCell(container, cells(container)[7]!);
      expect(tooltipOf(container)).toHaveTextContent('No data');
    });

    it('goes away when the pointer leaves, and can be turned off', () => {
      const { container, rerender } = renderMatrix();
      pointAtCell(container, cells(container)[0]!);
      fireEvent.pointerLeave(container.querySelector('.axon-chart__hit')!);
      expect(tooltipOf(container)).toBeNull();
      rerender(
        <Heatmap
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="merged"
          tooltip={false}
          animate={false}
        />,
      );
      pointAtCell(container, cells(container)[0]!);
      expect(tooltipOf(container)).toBeNull();
    });

    it('calls onCellClick with the row and where it is', () => {
      const onCellClick = vi.fn();
      const { container } = renderMatrix({ onCellClick });
      pointAtCell(container, cells(container)[1]!);
      fireEvent.click(container.querySelector('.axon-chart__hit')!);
      expect(onCellClick).toHaveBeenCalledWith(data[1], { x: '11am', y: 'Mon' });
    });
  });

  describe('the keyboard', () => {
    it('starts at the first cell and moves across and down with the arrow keys', async () => {
      const user = userEvent.setup();
      renderMatrix();
      chart().focus();
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Mon, 9am: 2');
      await user.keyboard('{ArrowRight}');
      expect(liveRegion()).toHaveTextContent('Mon, 11am: 10');
      await user.keyboard('{ArrowDown}');
      expect(liveRegion()).toHaveTextContent('Tue, 11am: 4');
      await user.keyboard('{ArrowLeft}');
      expect(liveRegion()).toHaveTextContent('Tue, 9am: 0');
      await user.keyboard('{ArrowUp}');
      expect(liveRegion()).toHaveTextContent('Mon, 9am: 2');
    });

    it('stops at the edges instead of leaving the grid', async () => {
      const user = userEvent.setup();
      renderMatrix();
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowLeft}{ArrowUp}');
      expect(liveRegion()).toHaveTextContent('Mon, 9am');
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(liveRegion()).toHaveTextContent('Wed, 9am');
    });

    it('says when a cell has no data', async () => {
      const user = userEvent.setup();
      renderMatrix();
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowDown}{ArrowDown}');
      expect(liveRegion()).toHaveTextContent('Wed, 9am: no data');
    });

    it('jumps to the ends of a row with Home and End, and lets go with Escape', async () => {
      const user = userEvent.setup();
      const { container } = renderMatrix();
      chart().focus();
      await user.keyboard('{ArrowRight}{End}');
      expect(liveRegion()).toHaveTextContent('Mon, 1pm: 6');
      await user.keyboard('{Home}');
      expect(liveRegion()).toHaveTextContent('Mon, 9am');
      await user.keyboard('{Escape}');
      expect(tooltipOf(container)).toBeNull();
    });

    it('chooses a cell with Enter', async () => {
      const user = userEvent.setup();
      const onCellClick = vi.fn();
      renderMatrix({ onCellClick });
      chart().focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
      expect(onCellClick).toHaveBeenCalledWith(data[1], { x: '11am', y: 'Mon' });
    });
  });

  it('shows loading and empty states', () => {
    const { rerender } = renderMatrix({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
    rerender(<Heatmap data={[]} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderMatrix({ title: 'Merged PRs', showValues: true });
    expect(await axe(container)).toHaveNoViolations();
    chart().focus();
    fireEvent.keyDown(chart(), { key: 'ArrowRight' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Heatmap (calendar)', () => {
  // January 2024 starts on a Monday. Give three weeks of days.
  const days = Array.from({ length: 21 }, (_, i) => ({
    date: new Date(2024, 0, 1 + i),
    count: i % 4 === 0 ? 0 : (i % 7) + 1,
  }));

  function renderCalendar(props: Partial<HeatmapProps> = {}) {
    return render(
      <Heatmap
        calendar
        data={days}
        dateKey="date"
        valueKey="count"
        locale="en-US"
        animate={false}
        {...props}
      />,
    );
  }

  it('has a cell for every day', () => {
    const { container } = renderCalendar();
    expect(cells(container)).toHaveLength(21);
  });

  it('puts weeks in columns and weekdays in rows, 16 pixels apart', () => {
    const { container } = renderCalendar();
    const [mon1, tue2, , , , , sun7, mon8] = cells(container) as Element[];
    // The first day, a Monday, is in the second row of a week that starts on Sunday.
    expect(num(tue2!, 'y') - num(mon1!, 'y')).toBe(16);
    expect(num(tue2!, 'x')).toBe(num(mon1!, 'x'));
    // Sunday the 7th starts the next week: one column over, at the top.
    expect(num(sun7!, 'x') - num(mon1!, 'x')).toBe(16);
    expect(num(sun7!, 'y')).toBeLessThan(num(mon1!, 'y'));
    expect(num(mon8!, 'x')).toBe(num(sun7!, 'x'));
  });

  it('is as wide as its weeks need, and as tall as a week', () => {
    const { container } = renderCalendar();
    const svg = container.querySelector('svg')!;
    // Left labels 34, then 4 weeks of 16, then 4. Seven rows of 16 plus the month labels.
    expect(svg).toHaveAttribute('width', String(34 + 4 * 16 + 4));
    expect(svg).toHaveAttribute('height', String(20 + 7 * 16 + 4));
  });

  it('can start the week on Monday', () => {
    const { container } = renderCalendar({ weekStartsOn: 1 });
    const [mon1, tue2] = cells(container) as [Element, Element];
    expect(num(mon1, 'y')).toBeLessThan(num(tue2, 'y'));
    const weekdays = [...container.querySelectorAll('text.axon-chart__tick-label')]
      .map((el) => el.textContent)
      .filter((text) => /^[A-Z][a-z]{2}$/.test(text ?? '') && text !== 'Jan');
    expect(weekdays).toEqual(['Tue', 'Thu', 'Sat']);
  });

  it('labels the month where it starts, and every other weekday', () => {
    const { container } = renderCalendar();
    const labels = [...container.querySelectorAll('text.axon-chart__tick-label')].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(expect.arrayContaining(['Jan', 'Mon', 'Wed', 'Fri']));
    expect(labels).not.toContain('Tue');
  });

  it('shows days with nothing in a quiet shade, and ones with data in solid shades', () => {
    const { container } = renderCalendar();
    const sorted = cells(container).map(level);
    expect(Math.max(...sorted)).toBe(4);
    expect(Math.min(...sorted)).toBe(0);
  });

  it('is described by its range and busiest day', () => {
    renderCalendar({ title: 'Contributions' });
    const label = chart().getAttribute('aria-label')!;
    expect(label).toMatch(/^Contributions\. Calendar heatmap from .*2024 to .*2024\./);
    expect(label).toMatch(/\d+ of 21 days have a value\./);
    expect(label).toMatch(/Highest \d+ on .*2024\./);
  });

  it('reads each day aloud as a date with its value', async () => {
    const user = userEvent.setup();
    renderCalendar();
    chart().focus();
    await user.keyboard('{ArrowRight}');
    expect(liveRegion()).toHaveTextContent(/^Jan 1, 2024: 0/);
  });

  it('moves a week with left and right, and a day with up and down', async () => {
    const user = userEvent.setup();
    renderCalendar();
    chart().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(liveRegion()).toHaveTextContent(/^Jan 8, 2024/);
    await user.keyboard('{ArrowLeft}');
    expect(liveRegion()).toHaveTextContent(/^Jan 1, 2024/);
    await user.keyboard('{ArrowDown}');
    expect(liveRegion()).toHaveTextContent(/^Jan 2, 2024/);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(liveRegion()).toHaveTextContent(/^Jan 1, 2024/);
  });

  it('jumps to the first and last day with Home and End', async () => {
    const user = userEvent.setup();
    renderCalendar();
    chart().focus();
    await user.keyboard('{ArrowRight}{End}');
    expect(liveRegion()).toHaveTextContent(/^Jan 21, 2024/);
    await user.keyboard('{Home}');
    expect(liveRegion()).toHaveTextContent(/^Jan 1, 2024/);
  });

  it('shows the date and value under the pointer, and calls onCellClick with the date', () => {
    const onCellClick = vi.fn();
    const { container } = renderCalendar({ onCellClick });
    pointAtCell(container, cells(container)[9]!);
    expect(tooltipOf(container)).toHaveTextContent(/Jan 10, 2024/);
    fireEvent.click(container.querySelector('.axon-chart__hit')!);
    const [, position] = onCellClick.mock.calls[0]!;
    expect((position as { date: Date }).date.getDate()).toBe(10);
  });

  it('reads dates given as text as that day, wherever you are', async () => {
    const user = userEvent.setup();
    renderCalendar({
      data: [
        { date: '2024-03-15', count: 3 },
        { date: '2024-03-16', count: 5 },
      ],
    });
    chart().focus();
    await user.keyboard('{ArrowRight}');
    expect(liveRegion()).toHaveTextContent(/^Mar 15, 2024: 3/);
  });

  it('leaves the table out of a long calendar unless asked, and lists only days with data', () => {
    const year = Array.from({ length: 120 }, (_, i) => ({
      date: new Date(2024, 0, 1 + i),
      count: 1,
    }));
    const { rerender } = renderCalendar({ data: year });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    rerender(
      <Heatmap calendar data={year} dateKey="date" valueKey="count" dataTable animate={false} />,
    );
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(121);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderCalendar({ title: 'Contributions' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
