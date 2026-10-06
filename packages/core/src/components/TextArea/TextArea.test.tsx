import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextArea } from './TextArea';

/** jsdom does no layout, so scrollHeight is always 0; fake the content height. */
function mockScrollHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(height);
}

/** Padding plus border the component adds to the line-based height (jsdom has default ones). */
function chrome(element: HTMLElement) {
  const s = window.getComputedStyle(element);
  return (
    parseFloat(s.paddingTop) +
      parseFloat(s.paddingBottom) +
      parseFloat(s.borderTopWidth) +
      parseFloat(s.borderBottomWidth) || 0
  );
}

function border(element: HTMLElement) {
  const s = window.getComputedStyle(element);
  return parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth) || 0;
}

describe('TextArea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links the label, forwards the ref and spreads props onto the textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { container } = render(
      <TextArea
        ref={ref}
        label="Message"
        required
        name="message"
        placeholder="Say hi"
        className="extra"
        data-testid="area"
      />,
    );
    const area = screen.getByRole('textbox', { name: 'Message' });
    expect(area).toBe(ref.current);
    expect(area).toBe(screen.getByTestId('area'));
    expect(area).toBeRequired();
    expect(area).toHaveAttribute('name', 'message');
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-text-area', 'extra');
  });

  it('defaults to 3 rows and honours minRows or rows', () => {
    const { rerender } = render(<TextArea aria-label="A" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
    rerender(<TextArea aria-label="A" rows={6} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
    rerender(<TextArea aria-label="A" minRows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('works uncontrolled', async () => {
    const onChange = vi.fn();
    render(<TextArea aria-label="A" defaultValue="Hi" onChange={onChange} />);
    const area = screen.getByRole('textbox');
    expect(area).toHaveValue('Hi');
    await userEvent.setup().type(area, ' there');
    expect(area).toHaveValue('Hi there');
    expect(onChange).toHaveBeenCalled();
  });

  it('works controlled', async () => {
    function Parent() {
      const [value, setValue] = useState('');
      return <TextArea aria-label="A" value={value} onChange={(e) => setValue(e.target.value)} />;
    }
    render(<Parent />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'abc');
    expect(screen.getByRole('textbox')).toHaveValue('abc');
  });

  it('describes the textarea with helper text, and with the error message in the error state', () => {
    const { rerender } = render(<TextArea label="Bio" helperText="Tell us" />);
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Tell us');
    rerender(<TextArea label="Bio" helperText="Tell us" error errorMessage="Too short" />);
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Too short');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a character counter with an optional limit', async () => {
    render(<TextArea label="Bio" showCount maxLength={20} />);
    expect(screen.getByText('0 / 20')).toBeInTheDocument();
    await userEvent.setup().type(screen.getByRole('textbox'), 'hello');
    expect(screen.getByText('5 / 20')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('5 / 20');
  });

  it('disables and supports read-only', () => {
    const { rerender, container } = render(<TextArea label="A" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(container.querySelector('.axon-input')).toHaveClass('axon-input--disabled');
    rerender(<TextArea label="A" readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  describe('autoResize', () => {
    it('does not set an inline height when autoResize is off', () => {
      mockScrollHeight(300);
      render(<TextArea aria-label="A" />);
      expect(screen.getByRole('textbox').style.height).toBe('');
    });

    it('fits the content height, never below minRows', () => {
      mockScrollHeight(0);
      const { rerender } = render(<TextArea aria-label="A" autoResize minRows={2} />);
      // 2 rows x 24px fallback line height
      expect(screen.getByRole('textbox').style.height).toBe(
        `${48 + chrome(screen.getByRole('textbox'))}px`,
      );
      mockScrollHeight(120);
      rerender(
        <TextArea
          aria-label="A"
          autoResize
          minRows={2}
          value="a\nb\nc\nd\ne"
          onChange={() => {}}
        />,
      );
      expect(screen.getByRole('textbox').style.height).toBe(
        `${120 + border(screen.getByRole('textbox'))}px`,
      );
    });

    it('caps the height at maxRows and enables scrolling', () => {
      mockScrollHeight(500);
      render(<TextArea aria-label="A" autoResize minRows={2} maxRows={4} />);
      const area = screen.getByRole('textbox');
      expect(area.style.height).toBe(`${96 + chrome(area)}px`);
      expect(area.style.overflowY).toBe('auto');
    });

    it('re-fits when the user types in an uncontrolled textarea', async () => {
      mockScrollHeight(0);
      render(<TextArea aria-label="A" autoResize minRows={1} />);
      const area = screen.getByRole('textbox');
      expect(area.style.height).toBe(`${24 + chrome(area)}px`);
      mockScrollHeight(72);
      await userEvent.setup().type(area, 'x');
      expect(area.style.height).toBe(`${72 + border(area)}px`);
    });

    it('uses rows=minRows and a non-draggable resize class', () => {
      render(<TextArea aria-label="A" autoResize minRows={4} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '4');
      expect(screen.getByRole('textbox')).toHaveClass('axon-input__field--auto-resize');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <TextArea label="Bio" helperText="Short" showCount maxLength={100} />
        <TextArea label="Notes" error errorMessage="Required" required />
        <TextArea label="Locked" disabled />
        <TextArea label="Auto" autoResize />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
