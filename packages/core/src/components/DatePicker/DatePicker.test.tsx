import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { toISODate } from '../../internal/date/date';
import { axeWithPortal } from '../../testing/axePortal';
import { DatePicker } from './DatePicker';

const oct15 = new Date(2026, 9, 15);
const textbox = () => screen.getByRole('textbox');
const calendarButton = () => screen.getByRole('button', { name: 'Choose date' });
const day = (name: string) => screen.getByRole('button', { name });
const iso = (date: Date | null | undefined) => (date ? toISODate(date) : null);

describe('DatePicker', () => {
  it('is a textbox named by its label with a locale placeholder', () => {
    render(<DatePicker label="Birthday" />);
    const input = screen.getByRole('textbox', { name: 'Birthday' });
    expect(input).toHaveAttribute('placeholder', 'MM/DD/YYYY');
    expect(input).toHaveValue('');
  });

  it('forwards the ref to the input, puts className/style on the wrapper and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <DatePicker ref={ref} label="D" className="extra" style={{ margin: 2 }} data-testid="in" />,
    );
    expect(ref.current).toBe(screen.getByTestId('in'));
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-date-picker', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('formats the value for the locale', () => {
    const { rerender } = render(<DatePicker label="D" defaultValue={oct15} />);
    expect(textbox()).toHaveValue('10/15/2026');
    rerender(<DatePicker label="D" key="gb" locale="en-GB" defaultValue={oct15} />);
    expect(textbox()).toHaveValue('15/10/2026');
    expect(textbox()).toHaveAttribute('placeholder', 'DD/MM/YYYY');
    rerender(<DatePicker label="D" key="de" locale="de-DE" defaultValue={oct15} />);
    expect(textbox()).toHaveValue('15.10.2026');
  });

  describe('calendar popover', () => {
    it('opens from the calendar button as a dialog with a labelled month grid', async () => {
      render(<DatePicker label="Birthday" defaultValue={oct15} />);
      await userEvent.setup().click(calendarButton());
      expect(screen.getByRole('dialog', { name: 'Birthday' })).toBeInTheDocument();
      const grid = screen.getByRole('grid', { name: 'October 2026' });
      expect(grid).toBeInTheDocument();
      expect(calendarButton()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    });

    it('puts focus on the selected date and gives it the only tab stop', async () => {
      render(<DatePicker label="D" defaultValue={oct15} />);
      await userEvent.setup().click(calendarButton());
      const selected = day('Thursday, October 15, 2026');
      expect(selected).toHaveFocus();
      expect(selected).toHaveAttribute('tabindex', '0');
      expect(selected.closest('td')).toHaveAttribute('aria-selected', 'true');
      const tabStops = screen
        .getAllByRole('button')
        .filter((b) => b.dataset['date'] && b.getAttribute('tabindex') === '0');
      expect(tabStops).toHaveLength(1);
    });

    it('selects a date with the mouse, fills the input, reports a local date and closes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} onChange={onChange} />);
      await user.click(calendarButton());
      await user.click(day('Monday, October 5, 2026'));
      expect(textbox()).toHaveValue('10/05/2026');
      expect(onChange).toHaveBeenCalledTimes(1);
      const [date] = onChange.mock.calls[0] as [Date];
      expect(iso(date)).toBe('2026-10-05');
      expect(date.getHours()).toBe(0);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('moves between months with the navigation buttons', async () => {
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} />);
      await user.click(calendarButton());
      await user.click(screen.getByRole('button', { name: 'Next month' }));
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      expect(screen.getByRole('grid', { name: 'September 2026' })).toBeInTheDocument();
    });

    it('closes with Escape and returns focus to the field', async () => {
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} />);
      await user.click(calendarButton());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(textbox()).toHaveFocus());
    });

    it('closes on an outside press', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>outside</button>
          <DatePicker label="D" />
        </>,
      );
      await user.click(calendarButton());
      await user.click(screen.getByRole('button', { name: 'outside' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens with Alt+ArrowDown from the input', async () => {
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} />);
      textbox().focus();
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders the dialog inside the closest .axon-root so theme variables apply', async () => {
      render(
        <div className="axon-root" data-testid="root">
          <DatePicker label="D" />
        </div>,
      );
      await userEvent.setup().click(calendarButton());
      expect(screen.getByTestId('root')).toContainElement(screen.getByRole('dialog'));
    });
  });

  describe('keyboard grid navigation', () => {
    async function openAt(date: Date, props = {}) {
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={date} {...props} />);
      await user.click(calendarButton());
      return user;
    }

    it('moves by day and week with the arrow keys', async () => {
      const user = await openAt(oct15);
      await user.keyboard('{ArrowRight}');
      expect(day('Friday, October 16, 2026')).toHaveFocus();
      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(day('Wednesday, October 14, 2026')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(day('Wednesday, October 21, 2026')).toHaveFocus();
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(day('Wednesday, October 7, 2026')).toHaveFocus();
    });

    it('crosses month boundaries and updates the month title', async () => {
      const user = await openAt(new Date(2026, 9, 31));
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
      expect(day('Sunday, November 1, 2026')).toHaveFocus();
    });

    it('jumps to the week edges with Home and End', async () => {
      const user = await openAt(oct15, { firstDayOfWeek: 0 });
      await user.keyboard('{Home}');
      expect(day('Sunday, October 11, 2026')).toHaveFocus();
      await user.keyboard('{End}');
      expect(day('Saturday, October 17, 2026')).toHaveFocus();
    });

    it('moves by month with PageUp/PageDown and by year with Shift', async () => {
      const user = await openAt(oct15);
      await user.keyboard('{PageDown}');
      expect(day('Sunday, November 15, 2026')).toHaveFocus();
      await user.keyboard('{PageUp}{PageUp}');
      expect(day('Tuesday, September 15, 2026')).toHaveFocus();
      await user.keyboard('{Shift>}{PageDown}{/Shift}');
      expect(day('Wednesday, September 15, 2027')).toHaveFocus();
    });

    it('selects the focused date with Enter and Space', async () => {
      const onChange = vi.fn();
      const user = await openAt(oct15, { onChange });
      await user.keyboard('{ArrowRight}{Enter}');
      expect(textbox()).toHaveValue('10/16/2026');
      await user.click(calendarButton());
      await user.keyboard('{ArrowLeft} ');
      expect(textbox()).toHaveValue('10/15/2026');
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('keeps focus inside min and max', async () => {
      const user = await openAt(oct15, { min: new Date(2026, 9, 14), max: new Date(2026, 9, 16) });
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(day('Friday, October 16, 2026')).toHaveFocus();
      await user.keyboard('{PageUp}');
      expect(day('Wednesday, October 14, 2026')).toHaveFocus();
    });
  });

  describe('min, max and disabled dates', () => {
    it('marks unavailable days aria-disabled and ignores clicks on them', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <DatePicker
          label="D"
          defaultValue={oct15}
          min={new Date(2026, 9, 10)}
          max={new Date(2026, 9, 20)}
          onChange={onChange}
        />,
      );
      await user.click(calendarButton());
      expect(day('Friday, October 9, 2026')).toHaveAttribute('aria-disabled', 'true');
      expect(day('Saturday, October 10, 2026')).not.toHaveAttribute('aria-disabled');
      expect(day('Wednesday, October 21, 2026')).toHaveAttribute('aria-disabled', 'true');
      await user.click(day('Wednesday, October 21, 2026'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('supports an isDateDisabled predicate', async () => {
      const user = userEvent.setup();
      render(
        <DatePicker
          label="D"
          defaultValue={oct15}
          isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
        />,
      );
      await user.click(calendarButton());
      expect(day('Saturday, October 17, 2026')).toHaveAttribute('aria-disabled', 'true');
      expect(day('Monday, October 19, 2026')).not.toHaveAttribute('aria-disabled');
    });

    it('rejects typed dates outside the range', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <DatePicker
          label="D"
          defaultValue={oct15}
          max={new Date(2026, 9, 20)}
          onChange={onChange}
        />,
      );
      await user.clear(textbox());
      await user.type(textbox(), '12/25/2026{Enter}');
      expect(onChange).not.toHaveBeenCalled();
      expect(textbox()).toHaveValue('10/15/2026');
    });
  });

  describe('typing', () => {
    it('commits a valid date on Enter and on blur', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" onChange={onChange} />);
      await user.type(textbox(), '3/7/2027{Enter}');
      expect(iso(onChange.mock.calls[0]![0])).toBe('2027-03-07');
      expect(textbox()).toHaveValue('03/07/2027');
      await user.clear(textbox());
      await user.type(textbox(), '12/25/2026');
      await user.tab();
      expect(iso(onChange.mock.calls[1]![0])).toBe('2026-12-25');
    });

    it('parses in the locale order and ISO format', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" locale="en-GB" onChange={onChange} />);
      await user.type(textbox(), '03/07/2027{Enter}');
      expect(iso(onChange.mock.calls[0]![0])).toBe('2027-07-03');
      await user.clear(textbox());
      await user.type(textbox(), '2027-01-02{Enter}');
      expect(iso(onChange.mock.calls[1]![0])).toBe('2027-01-02');
    });

    it('goes back to the last valid date for unusable text', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} onChange={onChange} />);
      await user.clear(textbox());
      await user.type(textbox(), '02/31/2026');
      await user.tab();
      expect(textbox()).toHaveValue('10/15/2026');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the value when the text is emptied', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" defaultValue={oct15} onChange={onChange} />);
      await user.clear(textbox());
      await user.tab();
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" value={oct15} onChange={onChange} />);
      await user.click(calendarButton());
      await user.click(day('Monday, October 5, 2026'));
      expect(iso(onChange.mock.calls[0]![0])).toBe('2026-10-05');
      expect(textbox()).toHaveValue('10/15/2026');
    });

    it('works with parent state, including external changes', async () => {
      function Parent() {
        const [value, setValue] = useState<Date | null>(null);
        return (
          <>
            <DatePicker label="D" value={value} onChange={setValue} />
            <button onClick={() => setValue(new Date(2030, 0, 2))}>set</button>
            <output>{iso(value) ?? 'none'}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(calendarButton());
      await user.click(document.querySelector('[data-date$="-01"]') as HTMLElement);
      expect(screen.getByRole('status')).not.toHaveTextContent('none');
      await user.click(screen.getByRole('button', { name: 'set' }));
      expect(textbox()).toHaveValue('01/02/2030');
    });
  });

  describe('footer actions and clearing', () => {
    it('has a Today action that selects today', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" onChange={onChange} />);
      await user.click(calendarButton());
      await user.click(screen.getByRole('button', { name: 'Today' }));
      const today = new Date();
      expect(iso(onChange.mock.calls[0]![0])).toBe(toISODate(today));
    });

    it('shows Clear in the footer only when there is a value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<DatePicker label="D" onChange={onChange} />);
      await user.click(calendarButton());
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
      await user.keyboard('{Escape}');
      rerender(<DatePicker label="D" defaultValue={oct15} key="v" onChange={onChange} />);
      await user.click(calendarButton());
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(onChange).toHaveBeenCalledWith(null);
      expect(textbox()).toHaveValue('');
    });

    it('has a clear button in the field when clearable', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<DatePicker label="D" clearable defaultValue={oct15} onChange={onChange} />);
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(onChange).toHaveBeenCalledWith(null);
      expect(textbox()).toHaveFocus();
    });
  });

  it('submits an ISO date through a hidden input when named', () => {
    const { container } = render(<DatePicker label="D" name="when" defaultValue={oct15} />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toHaveAttribute('name', 'when');
    expect(hidden.value).toBe('2026-10-15');
  });

  it('describes the field with helper or error text and marks required/invalid', () => {
    const { rerender } = render(<DatePicker label="D" helperText="Pick a date" required />);
    expect(textbox()).toHaveAccessibleDescription('Pick a date');
    expect(textbox()).toBeRequired();
    rerender(<DatePicker label="D" helperText="x" error errorMessage="Required" />);
    expect(textbox()).toHaveAccessibleDescription('Required');
    expect(textbox()).toHaveAttribute('aria-invalid', 'true');
  });

  it('is inert when disabled', () => {
    render(<DatePicker label="D" disabled />);
    expect(textbox()).toBeDisabled();
    expect(calendarButton()).toBeDisabled();
  });

  it('shows but does not edit or open when read-only', async () => {
    render(<DatePicker label="D" readOnly defaultValue={oct15} />);
    await userEvent.setup().type(textbox(), '1');
    expect(textbox()).toHaveValue('10/15/2026');
    expect(calendarButton()).toBeDisabled();
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <DatePicker label="Birthday" defaultValue={oct15} helperText="Pick a date" clearable />
        <DatePicker label="Error" error errorMessage="Required" required />
        <DatePicker label="Disabled" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getAllByRole('button', { name: 'Choose date' })[0]!);
    expect(await axeWithPortal(baseElement)).toHaveNoViolations();
  });
});
