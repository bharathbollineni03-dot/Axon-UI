import { createRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { toISODate } from '../../internal/date/date';
import { axeWithPortal } from '../../testing/axePortal';
import { DateRangePicker, type DateRange } from './DateRangePicker';

const range = (start: Date | null, end: Date | null): DateRange => ({ start, end });
const oct10 = new Date(2026, 9, 10);
const oct20 = new Date(2026, 9, 20);
const iso = (date: Date | null | undefined) => (date ? toISODate(date) : null);

const startInput = () => screen.getByRole('textbox', { name: 'Start date' });
const endInput = () => screen.getByRole('textbox', { name: 'End date' });
const openButton = () => screen.getByRole('button', { name: 'Choose date range' });
const day = (name: string) => screen.getByRole('button', { name });

describe('DateRangePicker', () => {
  it('is a labelled group of a start and an end date input', () => {
    render(<DateRangePicker label="Stay" />);
    const group = screen.getByRole('group', { name: 'Stay' });
    expect(within(group).getAllByRole('textbox')).toHaveLength(2);
    expect(startInput()).toHaveAttribute('placeholder', 'MM/DD/YYYY');
  });

  it('forwards the ref to the start input and puts className/style on the wrapper', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <DateRangePicker ref={ref} label="S" className="extra" style={{ margin: 2 }} />,
    );
    expect(ref.current).toBe(startInput());
    expect(container.firstElementChild).toHaveClass(
      'axon-field',
      'axon-date-range-picker',
      'extra',
    );
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('formats the range for the locale', () => {
    render(<DateRangePicker label="S" locale="en-GB" defaultValue={range(oct10, oct20)} />);
    expect(startInput()).toHaveValue('10/10/2026');
    expect(endInput()).toHaveValue('20/10/2026');
  });

  describe('calendar', () => {
    it('shows two consecutive months and marks the selected range', async () => {
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} />);
      await userEvent.setup().click(openButton());
      expect(screen.getByRole('dialog', { name: 'Choose date range' })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
      expect(day('Saturday, October 10, 2026').closest('td')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day('Tuesday, October 20, 2026').closest('td')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day('Thursday, October 15, 2026').closest('td')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day('Thursday, October 15, 2026').closest('td')).toHaveClass(
        'axon-calendar__cell--in-range',
      );
      expect(day('Friday, October 9, 2026').closest('td')).not.toHaveAttribute('aria-selected');
    });

    it('picks a range with two clicks, reporting each step, and closes after the second', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" onChange={onChange} />);
      await user.click(openButton());
      const dates = [...document.querySelectorAll('[data-date^="2026-"]')] as HTMLElement[];
      const first = dates.find((d) => d.dataset['date']?.endsWith('-05'))!;
      await user.click(first);
      expect(onChange).toHaveBeenLastCalledWith({ start: expect.any(Date), end: null });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      const startIso = onChange.mock.calls[0]![0].start;
      const later = [...document.querySelectorAll('[data-date]')].find(
        (d) =>
          (d as HTMLElement).dataset['date'] ===
          iso(new Date(startIso.getFullYear(), startIso.getMonth(), 12)),
      ) as HTMLElement;
      await user.click(later);
      const final = onChange.mock.calls.at(-1)![0] as DateRange;
      expect(final.end!.getDate()).toBe(12);
      expect(final.start!.getDate()).toBe(5);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect((startInput() as HTMLInputElement).value).toContain('/05/');
      expect((endInput() as HTMLInputElement).value).toContain('/12/');
    });

    it('orders the range when the second click is before the first', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} onChange={onChange} />);
      await user.click(openButton());
      await user.click(day('Sunday, October 25, 2026')); // starts a new selection
      await user.click(day('Thursday, October 22, 2026')); // earlier: becomes the start
      const final = onChange.mock.calls.at(-1)![0] as DateRange;
      expect(iso(final.start)).toBe('2026-10-22');
      expect(iso(final.end)).toBe('2026-10-25');
      expect(startInput()).toHaveValue('10/22/2026');
      expect(endInput()).toHaveValue('10/25/2026');
    });

    it('previews the range while hovering after the first click', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker label="S" />);
      await user.click(openButton());
      await user.click(day('Thursday, October 1, 2026'));
      fireEvent.mouseEnter(day('Monday, October 5, 2026'));
      const inRange = document.querySelectorAll('.axon-calendar__cell--in-range');
      expect(inRange).toHaveLength(3); // Oct 2, 3 and 4
    });

    it('moves both months with the navigation buttons', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} />);
      await user.click(openButton());
      await user.click(screen.getByRole('button', { name: 'Next month' }));
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: 'December 2026' })).toBeInTheDocument();
      expect(screen.queryByRole('grid', { name: 'October 2026' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    });

    it('navigates by keyboard across both grids and scrolls the view when leaving them', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} />);
      await user.click(openButton());
      expect(day('Saturday, October 10, 2026')).toHaveFocus();
      await user.keyboard('{PageDown}');
      expect(day('Tuesday, November 10, 2026')).toHaveFocus();
      await user.keyboard('{PageDown}');
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
      expect(screen.getByRole('grid', { name: 'December 2026' })).toBeInTheDocument();
      expect(day('Thursday, December 10, 2026')).toHaveFocus();
    });

    it('selects with Enter: start, then end', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} onChange={onChange} />);
      await user.click(openButton());
      await user.keyboard('{Enter}'); // Oct 10 starts a new selection
      await user.keyboard('{ArrowDown}{Enter}'); // Oct 17 ends it
      const final = onChange.mock.calls.at(-1)![0] as DateRange;
      expect(iso(final.start)).toBe('2026-10-10');
      expect(iso(final.end)).toBe('2026-10-17');
    });

    it('closes with Escape and an outside press', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>outside</button>
          <DateRangePicker label="S" />
        </>,
      );
      await user.click(openButton());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.click(openButton());
      await user.click(screen.getByRole('button', { name: 'outside' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('ignores days outside min/max or disabled by the predicate', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <DateRangePicker
          label="S"
          defaultValue={range(oct10, oct20)}
          min={new Date(2026, 9, 5)}
          max={new Date(2026, 9, 28)}
          isDateDisabled={(d) => d.getDay() === 0}
          onChange={onChange}
        />,
      );
      await user.click(openButton());
      expect(day('Saturday, October 3, 2026')).toHaveAttribute('aria-disabled', 'true');
      expect(day('Thursday, October 29, 2026')).toHaveAttribute('aria-disabled', 'true');
      expect(day('Sunday, October 11, 2026')).toHaveAttribute('aria-disabled', 'true');
      await user.click(day('Sunday, October 11, 2026'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('typing', () => {
    it('commits typed start and end dates', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" onChange={onChange} />);
      await user.type(startInput(), '10/1/2026{Enter}');
      await user.type(endInput(), '10/9/2026{Enter}');
      const final = onChange.mock.calls.at(-1)![0] as DateRange;
      expect(iso(final.start)).toBe('2026-10-01');
      expect(iso(final.end)).toBe('2026-10-09');
      expect(startInput()).toHaveValue('10/01/2026');
    });

    it('rejects an end before the start and reverts the text', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} onChange={onChange} />);
      await user.clear(endInput());
      await user.type(endInput(), '10/05/2026');
      await user.tab();
      expect(endInput()).toHaveValue('10/20/2026');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('drops the end when a later start is typed', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} onChange={onChange} />);
      await user.clear(startInput());
      await user.type(startInput(), '10/25/2026');
      await user.tab();
      const final = onChange.mock.calls.at(-1)![0] as DateRange;
      expect(iso(final.start)).toBe('2026-10-25');
      expect(final.end).toBeNull();
      expect(endInput()).toHaveValue('');
    });

    it('reverts unusable text and clears an end that is emptied', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" defaultValue={range(oct10, oct20)} onChange={onChange} />);
      await user.clear(startInput());
      await user.type(startInput(), 'soon');
      await user.tab();
      expect(startInput()).toHaveValue('10/10/2026');
      await user.clear(endInput());
      await user.tab();
      expect(onChange).toHaveBeenLastCalledWith({ start: expect.any(Date), end: null });
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DateRangePicker label="S" value={range(oct10, oct20)} onChange={onChange} />);
      await user.click(openButton());
      await user.click(day('Sunday, October 25, 2026'));
      expect(onChange).toHaveBeenCalled();
      expect(startInput()).toHaveValue('10/10/2026');
      expect(endInput()).toHaveValue('10/20/2026');
    });

    it('works with parent state, including external resets', async () => {
      function Parent() {
        const [value, setValue] = useState<DateRange>(range(null, null));
        return (
          <>
            <DateRangePicker label="S" value={value} onChange={setValue} />
            <button onClick={() => setValue(range(new Date(2030, 0, 2), new Date(2030, 0, 9)))}>
              set
            </button>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.type(startInput(), '1/1/2027{Enter}');
      expect(startInput()).toHaveValue('01/01/2027');
      await user.click(screen.getByRole('button', { name: 'set' }));
      expect(startInput()).toHaveValue('01/02/2030');
      expect(endInput()).toHaveValue('01/09/2030');
    });
  });

  it('clears with the field button and with the footer action', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DateRangePicker
        label="S"
        clearable
        defaultValue={range(oct10, oct20)}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: null, end: null });
    expect(startInput()).toHaveValue('');
    expect(startInput()).toHaveFocus();
  });

  it('submits the range through hidden inputs when named', () => {
    const { container } = render(
      <DateRangePicker
        label="S"
        startName="from"
        endName="to"
        defaultValue={range(oct10, oct20)}
      />,
    );
    const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];
    expect(hidden.map((h) => `${h.name}=${h.value}`)).toEqual(['from=2026-10-10', 'to=2026-10-20']);
  });

  it('describes the group with helper or error text and marks required/invalid', () => {
    const { rerender } = render(<DateRangePicker label="S" helperText="Pick dates" required />);
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Pick dates');
    expect(startInput()).toBeRequired();
    rerender(<DateRangePicker label="S" helperText="x" error errorMessage="Required" />);
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Required');
    expect(startInput()).toHaveAttribute('aria-invalid', 'true');
    expect(endInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('is inert when disabled and does not edit or open when read-only', async () => {
    const { unmount } = render(<DateRangePicker label="S" disabled />);
    expect(startInput()).toBeDisabled();
    expect(endInput()).toBeDisabled();
    expect(openButton()).toBeDisabled();
    unmount();
    render(<DateRangePicker label="S" readOnly defaultValue={range(oct10, oct20)} />);
    await userEvent.setup().type(startInput(), '1');
    expect(startInput()).toHaveValue('10/10/2026');
    expect(openButton()).toBeDisabled();
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <DateRangePicker
          label="Stay"
          defaultValue={range(oct10, oct20)}
          helperText="Pick dates"
          clearable
        />
        <DateRangePicker label="Error" error errorMessage="Required" required />
        <DateRangePicker label="Disabled" disabled />
      </div>,
    );
    expect(await axeWithPortal(container)).toHaveNoViolations();
    await user.click(screen.getAllByRole('button', { name: 'Choose date range' })[0]!);
    expect(await axeWithPortal(baseElement)).toHaveNoViolations();
  });
});
