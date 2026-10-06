import { createRef, useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { TimePicker } from './TimePicker';

/** Intl uses a narrow no-break space before AM/PM in newer ICU versions. */
const normalize = (text: string) => text.split(String.fromCharCode(0x202f)).join(' ');
const textbox = () => screen.getByRole('textbox');
const value = () => normalize((textbox() as HTMLInputElement).value);
const openButton = () => screen.getByRole('button', { name: 'Choose time' });
const column = (name: string) => screen.getByRole('listbox', { name });
const option = (columnName: string, text: string) =>
  within(column(columnName)).getByRole('option', { name: text });

describe('TimePicker', () => {
  it('is a textbox named by its label with a clock-style placeholder', () => {
    const { rerender } = render(<TimePicker label="Start" />);
    expect(screen.getByRole('textbox', { name: 'Start' })).toHaveAttribute(
      'placeholder',
      'h:mm AM',
    );
    rerender(<TimePicker label="Start" locale="de-DE" />);
    expect(textbox()).toHaveAttribute('placeholder', 'HH:mm');
  });

  it('forwards the ref to the input, puts className/style on the wrapper and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <TimePicker ref={ref} label="T" className="extra" style={{ margin: 2 }} data-testid="in" />,
    );
    expect(ref.current).toBe(screen.getByTestId('in'));
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-time-picker', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('formats the value for the locale and clock style', () => {
    const { rerender } = render(<TimePicker label="T" defaultValue="15:05" />);
    expect(value()).toBe('3:05 PM');
    rerender(<TimePicker label="T" key="de" locale="de-DE" defaultValue="15:05" />);
    expect(value()).toBe('15:05');
    rerender(<TimePicker label="T" key="h24" hourCycle={24} defaultValue="15:05" />);
    expect(value()).toBe('15:05');
    rerender(<TimePicker label="T" key="h12" locale="de-DE" hourCycle={12} defaultValue="00:30" />);
    expect(value()).toMatch(/^12:30/);
  });

  describe('picker', () => {
    it('opens a dialog with hour, minute and AM/PM columns and focuses the hours', async () => {
      render(<TimePicker label="Start" defaultValue="15:30" />);
      await userEvent.setup().click(openButton());
      expect(screen.getByRole('dialog', { name: 'Start' })).toBeInTheDocument();
      expect(column('Hours')).toHaveFocus();
      expect(within(column('Hours')).getAllByRole('option')).toHaveLength(12);
      expect(within(column('Minutes')).getAllByRole('option')).toHaveLength(12);
      expect(within(column('AM/PM')).getAllByRole('option')).toHaveLength(2);
      expect(option('Hours', '3')).toHaveAttribute('aria-selected', 'true');
      expect(option('Minutes', '30')).toHaveAttribute('aria-selected', 'true');
      expect(option('AM/PM', 'PM')).toHaveAttribute('aria-selected', 'true');
    });

    it('shows 24 hours and no AM/PM column on a 24-hour clock', async () => {
      render(<TimePicker label="T" hourCycle={24} defaultValue="15:30" />);
      await userEvent.setup().click(openButton());
      const hours = within(column('Hours')).getAllByRole('option');
      expect(hours).toHaveLength(24);
      expect(hours[0]).toHaveTextContent('00');
      expect(screen.queryByRole('listbox', { name: 'AM/PM' })).not.toBeInTheDocument();
      expect(option('Hours', '15')).toHaveAttribute('aria-selected', 'true');
    });

    it('changes the hour, keeping the minute and the period', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.click(option('Hours', '9'));
      expect(onChange).toHaveBeenLastCalledWith('21:30');
      expect(value()).toBe('9:30 PM');
    });

    it('changes the minute and the period', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.click(option('Minutes', '45'));
      expect(onChange).toHaveBeenLastCalledWith('15:45');
      await user.click(option('AM/PM', 'AM'));
      expect(onChange).toHaveBeenLastCalledWith('03:45');
      expect(value()).toBe('3:45 AM');
    });

    it('starts at noon when picking from an empty field', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" onChange={onChange} />);
      await user.click(openButton());
      await user.click(option('Minutes', '15'));
      expect(onChange).toHaveBeenLastCalledWith('12:15');
    });

    it('lists minutes by minuteStep and keeps an unlisted typed minute', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TimePicker label="T" minuteStep={15} defaultValue="10:07" />);
      await user.click(openButton());
      expect(
        within(column('Minutes'))
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['00', '07', '15', '30', '45']);
      await user.keyboard('{Escape}');
      rerender(<TimePicker label="T" key="1" minuteStep={1} />);
      await user.click(openButton());
      expect(within(column('Minutes')).getAllByRole('option')).toHaveLength(60);
    });

    it('closes with Escape and an outside press', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>outside</button>
          <TimePicker label="T" />
        </>,
      );
      await user.click(openButton());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.click(openButton());
      await user.click(screen.getByRole('button', { name: 'outside' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens with Alt+ArrowDown from the input', async () => {
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="09:00" />);
      textbox().focus();
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders the dialog inside the closest .axon-root so theme variables apply', async () => {
      render(
        <div className="axon-root" data-testid="root">
          <TimePicker label="T" />
        </div>,
      );
      await userEvent.setup().click(openButton());
      expect(screen.getByTestId('root')).toContainElement(screen.getByRole('dialog'));
    });
  });

  describe('keyboard in the columns', () => {
    it('moves and selects with ArrowDown/ArrowUp, exposing the active option', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.keyboard('{ArrowDown}');
      expect(onChange).toHaveBeenLastCalledWith('16:30');
      expect(column('Hours')).toHaveAttribute('aria-activedescendant', option('Hours', '4').id);
      await user.keyboard('{ArrowUp}{ArrowUp}');
      expect(onChange).toHaveBeenLastCalledWith('14:30');
    });

    it('jumps with Home and End', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" hourCycle={24} defaultValue="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.keyboard('{Home}');
      expect(onChange).toHaveBeenLastCalledWith('00:30');
      await user.keyboard('{End}');
      expect(onChange).toHaveBeenLastCalledWith('23:30');
    });

    it('moves between columns with Tab and closes with Enter', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.tab();
      expect(column('Minutes')).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      expect(onChange).toHaveBeenLastCalledWith('15:35');
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('min and max', () => {
    it('disables hours and minutes outside the range and ignores clicks on them', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <TimePicker
          label="T"
          hourCycle={24}
          defaultValue="10:30"
          min="09:00"
          max="17:30"
          onChange={onChange}
        />,
      );
      await user.click(openButton());
      expect(option('Hours', '08')).toHaveAttribute('aria-disabled', 'true');
      expect(option('Hours', '09')).not.toHaveAttribute('aria-disabled');
      expect(option('Hours', '18')).toHaveAttribute('aria-disabled', 'true');
      await user.click(option('Hours', '18'));
      expect(onChange).not.toHaveBeenCalled();
      await user.click(option('Hours', '17'));
      expect(option('Minutes', '35')).toHaveAttribute('aria-disabled', 'true');
      expect(option('Minutes', '30')).not.toHaveAttribute('aria-disabled');
    });

    it('rejects typed times outside the range', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <TimePicker label="T" defaultValue="10:00" min="09:00" max="17:00" onChange={onChange} />,
      );
      await user.clear(textbox());
      await user.type(textbox(), '8:00 PM{Enter}');
      expect(onChange).not.toHaveBeenCalled();
      expect(value()).toBe('10:00 AM');
    });
  });

  describe('typing', () => {
    it.each([
      ['3:30 pm', '15:30', '3:30 PM'],
      ['15:30', '15:30', '3:30 PM'],
      ['9', '09:00', '9:00 AM'],
      ['1230', '12:30', '12:30 PM'],
    ])('commits %s as %s', async (typed, stored, shown) => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" onChange={onChange} />);
      await user.type(textbox(), `${typed}{Enter}`);
      expect(onChange).toHaveBeenCalledWith(stored);
      expect(value()).toBe(shown);
    });

    it('commits on blur, reverts unusable text and clears when emptied', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" defaultValue="10:00" onChange={onChange} />);
      await user.clear(textbox());
      await user.type(textbox(), '99:99');
      await user.tab();
      expect(value()).toBe('10:00 AM');
      expect(onChange).not.toHaveBeenCalled();
      await user.clear(textbox());
      await user.tab();
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<TimePicker label="T" value="15:30" onChange={onChange} />);
      await user.click(openButton());
      await user.click(option('Minutes', '45'));
      expect(onChange).toHaveBeenCalledWith('15:45');
      expect(value()).toBe('3:30 PM');
    });

    it('works with parent state, including external changes', async () => {
      function Parent() {
        const [time, setTime] = useState<string | null>(null);
        return (
          <>
            <TimePicker label="T" value={time} onChange={setTime} />
            <button onClick={() => setTime('07:45')}>set</button>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.type(textbox(), '1pm{Enter}');
      expect(value()).toBe('1:00 PM');
      await user.click(screen.getByRole('button', { name: 'set' }));
      expect(value()).toBe('7:45 AM');
    });
  });

  it('sets the current time with "Now"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimePicker label="T" onChange={onChange} />);
    await user.click(openButton());
    await user.click(screen.getByRole('button', { name: 'Now' }));
    expect(onChange.mock.calls[0]![0]).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });

  it('clears with the field button and the footer action', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimePicker label="T" clearable defaultValue="10:00" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(textbox()).toHaveFocus();
    expect(value()).toBe('');
  });

  it('submits the 24-hour time through a hidden input when named', () => {
    const { container } = render(<TimePicker label="T" name="when" defaultValue="15:30" />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).toHaveAttribute('name', 'when');
    expect(hidden.value).toBe('15:30');
  });

  it('describes the field with helper or error text and marks required/invalid', () => {
    const { rerender } = render(<TimePicker label="T" helperText="Local time" required />);
    expect(textbox()).toHaveAccessibleDescription('Local time');
    expect(textbox()).toBeRequired();
    rerender(<TimePicker label="T" helperText="x" error errorMessage="Required" />);
    expect(textbox()).toHaveAccessibleDescription('Required');
    expect(textbox()).toHaveAttribute('aria-invalid', 'true');
  });

  it('is inert when disabled and does not edit or open when read-only', async () => {
    const { unmount } = render(<TimePicker label="T" disabled />);
    expect(textbox()).toBeDisabled();
    expect(openButton()).toBeDisabled();
    unmount();
    render(<TimePicker label="T" readOnly defaultValue="10:00" />);
    await userEvent.setup().type(textbox(), '1');
    expect(value()).toBe('10:00 AM');
    expect(openButton()).toBeDisabled();
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <TimePicker label="Start" defaultValue="15:30" helperText="Local time" clearable />
        <TimePicker label="Error" error errorMessage="Required" required />
        <TimePicker label="Disabled" disabled />
      </div>,
    );
    expect(await axeWithPortal(container)).toHaveNoViolations();
    await user.click(screen.getAllByRole('button', { name: 'Choose time' })[0]!);
    expect(await axeWithPortal(baseElement)).toHaveNoViolations();
  });
});
