import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Radio } from '../Radio';
import { RadioGroup } from './RadioGroup';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', description: 'Second' },
  { value: 'c', label: 'Gamma', disabled: true },
  { value: 'd', label: 'Delta' },
];

describe('RadioGroup', () => {
  it('renders a labelled radiogroup with one radio per option', () => {
    render(<RadioGroup label="Letter" options={options} />);
    expect(screen.getByRole('radiogroup', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAccessibleDescription('Second');
  });

  it('supports Radio children instead of options', () => {
    render(
      <RadioGroup label="Fruit" defaultValue="y">
        <Radio value="x" label="Apple" />
        <Radio value="y" label="Pear" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'Pear' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Apple' })).not.toBeChecked();
  });

  it('gives every radio the same generated name, or the given one', () => {
    const { rerender } = render(<RadioGroup label="L" options={options} />);
    const names = new Set(screen.getAllByRole('radio').map((r) => r.getAttribute('name')));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
    rerender(<RadioGroup label="L" options={options} name="letters" />);
    for (const radio of screen.getAllByRole('radio'))
      expect(radio).toHaveAttribute('name', 'letters');
  });

  describe('uncontrolled', () => {
    it('selects one value at a time and reports it', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RadioGroup label="L" options={options} defaultValue="a" onChange={onChange} />);
      expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
      await user.click(screen.getByRole('radio', { name: 'Beta' }));
      expect(onChange).toHaveBeenCalledWith('b');
      expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked();
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      render(<RadioGroup label="L" options={options} value="a" onChange={onChange} />);
      await userEvent.setup().click(screen.getByRole('radio', { name: 'Beta' }));
      expect(onChange).toHaveBeenCalledWith('b');
      expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
    });

    it('works with parent state and supports a null (empty) value', async () => {
      function Parent() {
        const [value, setValue] = useState<string | null>(null);
        return (
          <>
            <RadioGroup label="L" options={options} value={value} onChange={setValue} />
            <output>{String(value)}</output>
          </>
        );
      }
      render(<Parent />);
      for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
      await userEvent.setup().click(screen.getByRole('radio', { name: 'Delta' }));
      expect(screen.getByRole('status')).toHaveTextContent('d');
    });
  });

  describe('keyboard (WAI-ARIA radio group)', () => {
    it('puts only the selected radio in the tab order', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>before</button>
          <RadioGroup label="L" options={options} defaultValue="b" />
          <button>after</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
    });

    it('moves and selects with the arrow keys, skipping disabled options and wrapping', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<RadioGroup label="L" options={options} defaultValue="b" onChange={onChange} />);
      screen.getByRole('radio', { name: 'Beta' }).focus();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('radio', { name: 'Delta' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Delta' })).toBeChecked();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('radio', { name: 'Delta' })).toBeChecked();
      expect(onChange).toHaveBeenLastCalledWith('d');
    });
  });

  it('shares size and color, and disables every radio with `disabled`', () => {
    const { rerender } = render(
      <RadioGroup label="L" options={options} size="lg" color="success" />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.closest('label')).toHaveClass('axon-radio--lg', 'axon-radio--success');
    }
    rerender(<RadioGroup label="L" options={options} disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  describe('helper text, errors and required', () => {
    it('describes the group with helper or error text and sets aria-invalid', () => {
      const { rerender } = render(
        <RadioGroup label="L" options={options} helperText="Choose one" />,
      );
      expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription('Choose one');
      rerender(
        <RadioGroup
          label="L"
          options={options}
          helperText="Choose one"
          error
          errorMessage="Required"
        />,
      );
      expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription('Required');
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
    });

    it('marks the group and its radios required', () => {
      render(<RadioGroup label="L" options={options} required />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-required', 'true');
      for (const radio of screen.getAllByRole('radio')) expect(radio).toBeRequired();
    });
  });

  it('forwards the ref to the fieldset and merges className', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<RadioGroup ref={ref} label="L" options={options} className="extra" />);
    expect(ref.current).toHaveClass('axon-radio-group', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <RadioGroup label="Plain" options={options} defaultValue="a" helperText="Hint" />
        <RadioGroup
          label="Error"
          options={options}
          required
          error
          errorMessage="Required"
          orientation="horizontal"
        />
        <RadioGroup label="Disabled" options={options} disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
