import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('is a checkbox named by its label', () => {
    render(<Checkbox label="Accept terms" />);
    const box = screen.getByRole('checkbox', { name: 'Accept terms' });
    expect(box).not.toBeChecked();
  });

  it('forwards the ref to the input, puts className/style on the label and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Checkbox
        ref={ref}
        label="X"
        className="extra"
        style={{ margin: 3 }}
        name="terms"
        value="yes"
        required
        data-testid="box"
      />,
    );
    const box = screen.getByTestId('box');
    expect(ref.current).toBe(box);
    expect(box).toHaveAttribute('name', 'terms');
    expect(box).toHaveAttribute('value', 'yes');
    expect(box).toBeRequired();
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('LABEL');
    expect(root).toHaveClass('axon-choice', 'axon-checkbox', 'extra');
    expect(root).toHaveStyle({ margin: '3px' });
  });

  it('applies size and color modifiers', () => {
    const { container } = render(<Checkbox label="X" size="lg" color="success" />);
    expect(container.firstElementChild).toHaveClass('axon-checkbox--lg', 'axon-checkbox--success');
  });

  describe('uncontrolled', () => {
    it('toggles on click, on the label text and on Space', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Checkbox label="Opt in" onChange={onChange} />);
      const box = screen.getByRole('checkbox');
      await user.click(box);
      expect(box).toBeChecked();
      await user.click(screen.getByText('Opt in'));
      expect(box).not.toBeChecked();
      box.focus();
      await user.keyboard(' ');
      expect(box).toBeChecked();
      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('starts checked with defaultChecked', () => {
      render(<Checkbox label="X" defaultChecked />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('controlled', () => {
    it('follows the checked prop', async () => {
      const onChange = vi.fn();
      render(<Checkbox label="X" checked={false} onChange={onChange} />);
      await userEvent.setup().click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('works with parent state', async () => {
      function Parent() {
        const [checked, setChecked] = useState(false);
        return (
          <Checkbox label="X" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        );
      }
      render(<Parent />);
      await userEvent.setup().click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('indeterminate', () => {
    it('sets the indeterminate DOM property and exposes the mixed state', () => {
      render(<Checkbox label="All" indeterminate />);
      const box = screen.getByRole('checkbox') as HTMLInputElement;
      expect(box.indeterminate).toBe(true);
      expect(box).toBePartiallyChecked();
    });

    it('stays in sync with the prop after the browser clears it on click', async () => {
      function Parent() {
        const [checked, setChecked] = useState(false);
        return (
          <Checkbox
            label="All"
            indeterminate
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
        );
      }
      render(<Parent />);
      await userEvent.setup().click(screen.getByRole('checkbox'));
      expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
    });

    it('clears when the prop becomes false', () => {
      const { rerender } = render(<Checkbox label="All" indeterminate />);
      rerender(<Checkbox label="All" indeterminate={false} />);
      expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(false);
    });
  });

  it('describes the checkbox with its description', () => {
    render(<Checkbox label="Newsletter" description="One email a week" />);
    expect(screen.getByRole('checkbox', { name: 'Newsletter' })).toHaveAccessibleDescription(
      'One email a week',
    );
  });

  it('marks the error state', () => {
    const { container } = render(<Checkbox label="X" error />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(container.firstElementChild).toHaveClass('axon-checkbox--error');
  });

  it('does not toggle when disabled', async () => {
    const onChange = vi.fn();
    const { container } = render(<Checkbox label="X" disabled onChange={onChange} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(container.firstElementChild).toHaveClass('axon-choice--disabled');
    await userEvent.setup().click(screen.getByText('X'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('can be used without a visible label when given an aria-label', () => {
    render(<Checkbox aria-label="Select row" />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Checkbox label="Plain" />
        <Checkbox label="Checked" defaultChecked description="Hint" />
        <Checkbox label="Mixed" indeterminate />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Error" error />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
