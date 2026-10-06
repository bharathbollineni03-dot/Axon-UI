import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from './NumberInput';

const input = () => screen.getByRole('spinbutton');

describe('NumberInput', () => {
  it('is a labelled spinbutton exposing its value and range', () => {
    render(<NumberInput label="Quantity" defaultValue={5} min={1} max={10} />);
    const el = screen.getByRole('spinbutton', { name: 'Quantity' });
    expect(el).toHaveValue('5');
    expect(el).toHaveAttribute('aria-valuenow', '5');
    expect(el).toHaveAttribute('aria-valuemin', '1');
    expect(el).toHaveAttribute('aria-valuemax', '10');
  });

  it('omits aria-valuenow when empty', () => {
    render(<NumberInput aria-label="Qty" />);
    expect(input()).toHaveValue('');
    expect(input()).not.toHaveAttribute('aria-valuenow');
  });

  it('forwards the ref, puts className on the root and spreads props onto the input', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <NumberInput ref={ref} aria-label="Qty" name="qty" className="extra" placeholder="0" />,
    );
    expect(ref.current).toBe(input());
    expect(input()).toHaveAttribute('name', 'qty');
    expect(input()).toHaveAttribute('placeholder', '0');
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-number-input', 'extra');
  });

  describe('typing', () => {
    it('reports parsed numbers as the user types (uncontrolled)', async () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Qty" onChange={onChange} />);
      await userEvent.setup().type(input(), '42');
      expect(input()).toHaveValue('42');
      expect(onChange).toHaveBeenNthCalledWith(1, 4);
      expect(onChange).toHaveBeenNthCalledWith(2, 42);
    });

    it('reports null when the field is emptied', async () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Qty" defaultValue={7} onChange={onChange} />);
      await userEvent.setup().clear(input());
      expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it('rejects characters that cannot form a number', async () => {
      render(<NumberInput aria-label="Qty" />);
      await userEvent.setup().type(input(), 'a1b.5c');
      expect(input()).toHaveValue('1.5');
    });

    it('allows a leading minus only when negatives are possible', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NumberInput aria-label="Qty" />);
      await user.type(input(), '-3');
      expect(input()).toHaveValue('-3');
      rerender(<NumberInput aria-label="Qty" key="positive" min={0} />);
      await user.type(input(), '-3');
      expect(input()).toHaveValue('3');
    });

    it('disallows decimals when precision is 0', async () => {
      render(<NumberInput aria-label="Qty" precision={0} />);
      await userEvent.setup().type(input(), '1.5');
      expect(input()).toHaveValue('15');
      expect(input()).toHaveAttribute('inputmode', 'numeric');
    });

    it('does not report partial input such as "-" or "1."', async () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Qty" onChange={onChange} />);
      await userEvent.setup().type(input(), '-');
      expect(onChange).not.toHaveBeenCalled();
      expect(input()).toHaveValue('-');
    });
  });

  describe('committing', () => {
    it('clamps to min/max on blur', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" min={1} max={10} onChange={onChange} />);
      await user.type(input(), '50');
      await user.tab();
      expect(input()).toHaveValue('10');
      expect(onChange).toHaveBeenLastCalledWith(10);
    });

    it('reverts unparseable text to the last value on blur', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={8} />);
      await user.clear(input());
      await user.type(input(), '-');
      await user.tab();
      // empty is a valid "no value"; a lone minus reverts to it
      expect(input()).toHaveValue('');
    });

    it('formats to the given precision on blur', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Price" precision={2} />);
      await user.type(input(), '1.5');
      await user.tab();
      expect(input()).toHaveValue('1.50');
    });

    it('rounds to precision', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<NumberInput aria-label="Price" precision={1} onChange={onChange} />);
      await user.type(input(), '2.46');
      await user.tab();
      expect(input()).toHaveValue('2.5');
      expect(onChange).toHaveBeenLastCalledWith(2.5);
    });

    it('commits on Enter and still lets the form submit', async () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      const user = userEvent.setup();
      render(
        <form onSubmit={onSubmit}>
          <NumberInput aria-label="Qty" max={5} />
        </form>,
      );
      await user.type(input(), '9{Enter}');
      expect(input()).toHaveValue('5');
      expect(onSubmit).toHaveBeenCalled();
    });

    it('calls the consumer onBlur and onKeyDown', async () => {
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" onBlur={onBlur} onKeyDown={onKeyDown} />);
      await user.click(input());
      await user.keyboard('1');
      await user.tab();
      expect(onKeyDown).toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard', () => {
    it('steps with ArrowUp and ArrowDown', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={5} onChange={onChange} />);
      input().focus();
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('6');
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(input()).toHaveValue('4');
      expect(onChange).toHaveBeenLastCalledWith(4);
    });

    it('steps by 10x with Shift+Arrow and PageUp/PageDown', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={0} step={2} />);
      input().focus();
      await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
      expect(input()).toHaveValue('20');
      await user.keyboard('{PageUp}');
      expect(input()).toHaveValue('40');
      await user.keyboard('{PageDown}{PageDown}');
      expect(input()).toHaveValue('0');
    });

    it('jumps to min and max with Home and End when they are set', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={5} min={1} max={9} />);
      input().focus();
      await user.keyboard('{End}');
      expect(input()).toHaveValue('9');
      await user.keyboard('{Home}');
      expect(input()).toHaveValue('1');
    });

    it('starts from 0 (clamped) when empty', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" min={3} />);
      input().focus();
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('3');
    });

    it('stops at min and max', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={9} min={0} max={10} />);
      input().focus();
      await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
      expect(input()).toHaveValue('10');
    });

    it('avoids floating point drift with fractional steps', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={0.1} step={0.1} />);
      input().focus();
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('0.2');
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('0.3');
    });

    it('does not step when read-only or disabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<NumberInput aria-label="Qty" defaultValue={5} readOnly />);
      input().focus();
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('5');
      rerender(<NumberInput aria-label="Qty" defaultValue={5} disabled />);
      expect(input()).toBeDisabled();
    });
  });

  describe('steppers', () => {
    it('renders labelled, non-tabbable increase and decrease buttons', () => {
      render(<NumberInput aria-label="Qty" defaultValue={1} />);
      const inc = screen.getByRole('button', { name: 'Increase' });
      const dec = screen.getByRole('button', { name: 'Decrease' });
      expect(inc).toHaveAttribute('tabindex', '-1');
      expect(dec).toHaveAttribute('tabindex', '-1');
      expect(inc).toHaveAttribute('aria-controls', input().id);
    });

    it('steps the value and keeps focus in the input', async () => {
      const user = userEvent.setup();
      render(<NumberInput aria-label="Qty" defaultValue={5} step={5} />);
      input().focus();
      await user.click(screen.getByRole('button', { name: 'Increase' }));
      expect(input()).toHaveValue('10');
      expect(input()).toHaveFocus();
      await user.click(screen.getByRole('button', { name: 'Decrease' }));
      expect(input()).toHaveValue('5');
    });

    it('disables a stepper at its bound', () => {
      const { rerender } = render(<NumberInput aria-label="Qty" defaultValue={10} max={10} />);
      expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Decrease' })).toBeEnabled();
      rerender(<NumberInput aria-label="Qty" key="min" defaultValue={0} min={0} />);
      expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
    });

    it('supports custom labels and can be hidden', () => {
      const { rerender } = render(
        <NumberInput aria-label="Qty" incrementLabel="Más" decrementLabel="Menos" />,
      );
      expect(screen.getByRole('button', { name: 'Más' })).toBeInTheDocument();
      rerender(<NumberInput aria-label="Qty" hideSteppers />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides steppers when read-only and disables them when disabled', () => {
      const { rerender } = render(<NumberInput aria-label="Qty" readOnly />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      rerender(<NumberInput aria-label="Qty" disabled />);
      for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    });
  });

  describe('controlled', () => {
    it('shows the value prop and follows external updates', () => {
      const { rerender } = render(<NumberInput aria-label="Qty" value={3} onChange={() => {}} />);
      expect(input()).toHaveValue('3');
      rerender(<NumberInput aria-label="Qty" value={8} onChange={() => {}} />);
      expect(input()).toHaveValue('8');
      rerender(<NumberInput aria-label="Qty" value={null} onChange={() => {}} />);
      expect(input()).toHaveValue('');
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState<number | null>(1);
        return (
          <>
            <NumberInput aria-label="Qty" value={value} onChange={setValue} max={5} />
            <output>{String(value)}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(screen.getByRole('button', { name: 'Increase' }));
      expect(screen.getByRole('status')).toHaveTextContent('2');
      await user.clear(input());
      expect(screen.getByRole('status')).toHaveTextContent('null');
    });

    it('lets the parent override what the user typed', async () => {
      function Parent() {
        const [value, setValue] = useState<number | null>(1);
        // The parent never allows more than 3.
        return (
          <NumberInput
            aria-label="Qty"
            value={value}
            onChange={(v) => setValue(v === null ? null : Math.min(v, 3))}
          />
        );
      }
      render(<Parent />);
      await userEvent.setup().type(input(), '{Backspace}9');
      expect(input()).toHaveValue('3');
    });
  });

  describe('field chrome', () => {
    it('describes the input with helper text and error messages', () => {
      const { rerender } = render(<NumberInput label="Qty" helperText="Max 10" />);
      expect(input()).toHaveAccessibleDescription('Max 10');
      rerender(<NumberInput label="Qty" helperText="Max 10" error errorMessage="Too many" />);
      expect(input()).toHaveAccessibleDescription('Too many');
      expect(input()).toHaveAttribute('aria-invalid', 'true');
    });

    it('applies size, variant and color modifiers and required marker', () => {
      const { container } = render(
        <NumberInput label="Qty" required size="sm" variant="filled" color="warning" />,
      );
      expect(container.querySelector('.axon-input')).toHaveClass(
        'axon-input--sm',
        'axon-input--filled',
        'axon-input--warning',
      );
      expect(input()).toBeRequired();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <NumberInput label="Quantity" defaultValue={2} min={0} max={10} helperText="Up to 10" />
        <NumberInput label="Error" error errorMessage="Invalid" />
        <NumberInput label="Disabled" disabled />
        <NumberInput label="Read only" readOnly defaultValue={1} />
        <NumberInput label="No steppers" hideSteppers />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
