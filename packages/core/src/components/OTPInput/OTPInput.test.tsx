import { createRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { OTPInput } from './OTPInput';

const boxes = () => within(screen.getByRole('group')).getAllByRole('textbox') as HTMLInputElement[];
const code = () =>
  boxes()
    .map((box) => box.value)
    .join('');

describe('OTPInput', () => {
  it('renders a labelled group of boxes, six by default', () => {
    render(<OTPInput label="Verification code" />);
    expect(screen.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
    expect(boxes()[0]).toHaveAccessibleName('Digit 1 of 6');
    expect(boxes()[5]).toHaveAccessibleName('Digit 6 of 6');
  });

  it('names the group without a visible label, and supports another length', () => {
    const { rerender } = render(<OTPInput length={4} />);
    expect(screen.getByRole('group', { name: 'One-time code' })).toBeInTheDocument();
    expect(boxes()).toHaveLength(4);
    rerender(<OTPInput length={4} aria-label="PIN" />);
    expect(screen.getByRole('group', { name: 'PIN' })).toBeInTheDocument();
  });

  it('uses numeric input hints and enables one-time-code autofill on the first box', () => {
    render(<OTPInput label="C" />);
    expect(boxes()[0]).toHaveAttribute('inputmode', 'numeric');
    expect(boxes()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(boxes()[1]).toHaveAttribute('autocomplete', 'off');
  });

  it('forwards the ref to the first box and puts className/style on the wrapper', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <OTPInput
        ref={ref}
        label="C"
        className="extra"
        style={{ margin: 2 }}
        size="lg"
        color="success"
      />,
    );
    expect(ref.current).toBe(boxes()[0]);
    expect(container.firstElementChild).toHaveClass(
      'axon-field',
      'axon-otp-input',
      'extra',
      'axon-otp-input--lg',
      'axon-otp-input--success',
    );
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  describe('typing', () => {
    it('fills boxes left to right, advancing focus, and reports each change', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" onChange={onChange} />);
      boxes()[0]!.focus();
      await user.keyboard('123');
      expect(code()).toBe('123');
      expect(boxes()[3]).toHaveFocus();
      expect(onChange.mock.calls.map((c) => c[0])).toEqual(['1', '12', '123']);
    });

    it('calls onComplete once the last box is filled', async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" length={4} onComplete={onComplete} />);
      boxes()[0]!.focus();
      await user.keyboard('123');
      expect(onComplete).not.toHaveBeenCalled();
      await user.keyboard('4');
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('1234');
    });

    it('ignores characters that are not allowed', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" />);
      boxes()[0]!.focus();
      await user.keyboard('a1-b2');
      expect(code()).toBe('12');
    });

    it('accepts letters with type="alphanumeric" and labels the boxes as characters', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" type="alphanumeric" length={4} />);
      expect(boxes()[0]).toHaveAccessibleName('Character 1 of 4');
      expect(boxes()[0]).toHaveAttribute('inputmode', 'text');
      boxes()[0]!.focus();
      await user.keyboard('A-b9');
      expect(code()).toBe('Ab9');
    });

    it('overwrites a filled box', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="123456" />);
      boxes()[2]!.focus();
      await user.keyboard('9');
      expect(code()).toBe('129456');
      expect(boxes()[3]).toHaveFocus();
    });

    it('sends focus to the first empty box when a later empty box is focused', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="12" />);
      await user.click(boxes()[5]!);
      expect(boxes()[2]).toHaveFocus();
    });
  });

  describe('deleting and moving', () => {
    it('Backspace on a filled box removes it and keeps focus there', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="1234" />);
      boxes()[1]!.focus();
      await user.keyboard('{Backspace}');
      expect(code()).toBe('134');
      expect(boxes()[1]).toHaveFocus();
    });

    it('Backspace on an empty box clears the previous box and moves back', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="12" onChange={onChange} />);
      boxes()[2]!.focus();
      await user.keyboard('{Backspace}');
      expect(code()).toBe('1');
      expect(boxes()[1]).toHaveFocus();
      expect(onChange).toHaveBeenLastCalledWith('1');
      await user.keyboard('{Backspace}{Backspace}');
      expect(code()).toBe('');
      expect(boxes()[0]).toHaveFocus();
    });

    it('Delete removes the current character', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="1234" />);
      boxes()[0]!.focus();
      await user.keyboard('{Delete}');
      expect(code()).toBe('234');
    });

    it('moves with the arrow keys but never past the next empty box', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="12" />);
      boxes()[0]!.focus();
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(boxes()[2]).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(boxes()[1]).toHaveFocus();
      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(boxes()[0]).toHaveFocus();
    });

    it('jumps with Home and End', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="123" />);
      boxes()[1]!.focus();
      await user.keyboard('{End}');
      expect(boxes()[3]).toHaveFocus();
      await user.keyboard('{Home}');
      expect(boxes()[0]).toHaveFocus();
    });

    it('clears a box when its content is cut or deleted by other means', () => {
      const onChange = vi.fn();
      render(<OTPInput label="C" defaultValue="123" onChange={onChange} />);
      fireEvent.change(boxes()[1]!, { target: { value: '' } });
      expect(code()).toBe('13');
      expect(onChange).toHaveBeenLastCalledWith('13');
    });
  });

  describe('paste and autofill', () => {
    it('fills every box from a pasted code', async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" onComplete={onComplete} />);
      boxes()[0]!.focus();
      await user.paste('123456');
      expect(code()).toBe('123456');
      expect(onComplete).toHaveBeenCalledWith('123456');
      expect(boxes()[5]).toHaveFocus();
    });

    it('sanitizes the pasted text and truncates it to the length', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" length={4} />);
      boxes()[0]!.focus();
      await user.paste('12-34 56');
      expect(code()).toBe('1234');
    });

    it('pastes from the box it lands in, overwriting what follows', async () => {
      const user = userEvent.setup();
      render(<OTPInput label="C" defaultValue="123" />);
      boxes()[1]!.focus();
      await user.paste('99');
      expect(code()).toBe('199');
    });

    it('ignores a paste with nothing usable', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" onChange={onChange} />);
      boxes()[0]!.focus();
      await user.paste('abc');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('accepts a whole code delivered into one box (SMS autofill)', () => {
      const onComplete = vi.fn();
      render(<OTPInput label="C" onComplete={onComplete} />);
      fireEvent.change(boxes()[0]!, { target: { value: '654321' } });
      expect(code()).toBe('654321');
      expect(onComplete).toHaveBeenCalledWith('654321');
    });
  });

  describe('options', () => {
    it('masks the characters', () => {
      render(<OTPInput label="C" mask defaultValue="12" />);
      const masked = screen.getAllByLabelText(/Digit [0-9] of 6/) as HTMLInputElement[];
      expect(masked).toHaveLength(6);
      for (const box of masked) {
        expect(box).toHaveAttribute('type', 'password');
        expect(box).toHaveAttribute('autocomplete', 'off');
      }
    });

    it('starts from a sanitized, truncated defaultValue', () => {
      render(<OTPInput label="C" length={4} defaultValue="12ab3456" />);
      expect(code()).toBe('1234');
    });

    it('focuses the first empty box on mount with autoFocus', () => {
      // The autoFocus lint rule targets pages; here we are testing the prop itself.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      render(<OTPInput label="C" defaultValue="12" autoFocus />);
      expect(boxes()[2]).toHaveFocus();
    });

    it('supports custom box labels', () => {
      render(<OTPInput label="C" length={2} getBoxLabel={(i, n) => `Cifra ${i + 1} de ${n}`} />);
      expect(boxes()[1]).toHaveAccessibleName('Cifra 2 de 2');
    });

    it('submits the whole code through a hidden input when named', async () => {
      const user = userEvent.setup();
      const { container } = render(<OTPInput label="C" name="otp" />);
      boxes()[0]!.focus();
      await user.keyboard('1234');
      const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
      expect(hidden).toHaveAttribute('name', 'otp');
      expect(hidden.value).toBe('1234');
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<OTPInput label="C" value="12" onChange={onChange} />);
      boxes()[2]!.focus();
      await user.keyboard('3');
      expect(onChange).toHaveBeenCalledWith('123');
      expect(code()).toBe('12');
    });

    it('works with parent state, including a reset', async () => {
      function Parent() {
        const [otp, setOtp] = useState('');
        return (
          <>
            <OTPInput label="C" value={otp} onChange={setOtp} />
            <button onClick={() => setOtp('')}>reset</button>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      boxes()[0]!.focus();
      await user.keyboard('1234');
      expect(code()).toBe('1234');
      await user.click(screen.getByRole('button', { name: 'reset' }));
      expect(code()).toBe('');
    });
  });

  it('describes the group with helper or error text and marks boxes invalid/required', () => {
    const { container, rerender } = render(
      <OTPInput label="C" helperText="Check your SMS" required />,
    );
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Check your SMS');
    for (const box of boxes()) expect(box).toHaveAttribute('aria-required', 'true');
    rerender(<OTPInput label="C" helperText="x" error errorMessage="Wrong code" />);
    expect(screen.getByRole('group')).toHaveAccessibleDescription('Wrong code');
    for (const box of boxes()) expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(container.firstElementChild).toHaveClass('axon-otp-input--error');
  });

  it('is inert when disabled and does not change when read-only', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OTPInput label="C" disabled />);
    for (const box of boxes()) expect(box).toBeDisabled();
    unmount();
    render(<OTPInput label="C" readOnly defaultValue="12" />);
    boxes()[0]!.focus();
    await user.keyboard('{Backspace}9');
    await user.paste('999');
    expect(code()).toBe('12');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <OTPInput label="Code" defaultValue="123" helperText="Check your SMS" />
        <OTPInput label="Error" error errorMessage="Wrong code" required />
        <OTPInput label="Masked" mask />
        <OTPInput aria-label="PIN" length={4} />
        <OTPInput label="Disabled" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
