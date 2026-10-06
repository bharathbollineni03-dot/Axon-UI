import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../Checkbox';
import { CheckboxGroup } from './CheckboxGroup';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', description: 'Second' },
  { value: 'c', label: 'Gamma', disabled: true },
];

describe('CheckboxGroup', () => {
  it('renders a labelled group with one checkbox per option', () => {
    render(<CheckboxGroup label="Letters" options={options} />);
    expect(screen.getByRole('group', { name: 'Letters' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: 'Beta' })).toHaveAccessibleDescription('Second');
    expect(screen.getByRole('checkbox', { name: 'Gamma' })).toBeDisabled();
  });

  it('supports Checkbox children instead of options', () => {
    render(
      <CheckboxGroup label="Fruit" defaultValue={['x']}>
        <Checkbox value="x" label="Apple" />
        <Checkbox value="y" label="Pear" />
      </CheckboxGroup>,
    );
    expect(screen.getByRole('checkbox', { name: 'Apple' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Pear' })).not.toBeChecked();
  });

  describe('uncontrolled', () => {
    it('tracks checked values as a string[] and reports changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CheckboxGroup label="L" options={options} defaultValue={['a']} onChange={onChange} />,
      );
      expect(screen.getByRole('checkbox', { name: 'Alpha' })).toBeChecked();
      await user.click(screen.getByRole('checkbox', { name: 'Beta' }));
      expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
      await user.click(screen.getByRole('checkbox', { name: 'Alpha' }));
      expect(onChange).toHaveBeenLastCalledWith(['b']);
      expect(screen.getByRole('checkbox', { name: 'Alpha' })).not.toBeChecked();
    });
  });

  describe('controlled', () => {
    it('follows the value prop', async () => {
      const onChange = vi.fn();
      render(<CheckboxGroup label="L" options={options} value={['b']} onChange={onChange} />);
      expect(screen.getByRole('checkbox', { name: 'Beta' })).toBeChecked();
      await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Alpha' }));
      expect(onChange).toHaveBeenCalledWith(['b', 'a']);
      expect(screen.getByRole('checkbox', { name: 'Alpha' })).not.toBeChecked();
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState<string[]>([]);
        return (
          <>
            <CheckboxGroup label="L" options={options} value={value} onChange={setValue} />
            <output>{value.join(',')}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(screen.getByRole('checkbox', { name: 'Alpha' }));
      await user.click(screen.getByRole('checkbox', { name: 'Beta' }));
      expect(screen.getByRole('status')).toHaveTextContent('a,b');
    });
  });

  it('shares size, color and name with its checkboxes', () => {
    render(<CheckboxGroup label="L" options={options} size="sm" color="danger" name="letters" />);
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('name', 'letters');
      expect(box.closest('label')).toHaveClass('axon-checkbox--sm', 'axon-checkbox--danger');
    }
  });

  it('disables every checkbox with `disabled`', () => {
    render(<CheckboxGroup label="L" options={options} disabled />);
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled();
  });

  it('supports horizontal orientation', () => {
    const { container } = render(
      <CheckboxGroup label="L" options={options} orientation="horizontal" />,
    );
    expect(container.querySelector('.axon-option-group__items')).toHaveClass(
      'axon-option-group__items--horizontal',
    );
  });

  describe('helper text and errors', () => {
    it('describes the group with helper text', () => {
      render(<CheckboxGroup label="L" options={options} helperText="Pick any" />);
      expect(screen.getByRole('group', { name: 'L' })).toHaveAccessibleDescription('Pick any');
    });

    it('shows the error message and marks every checkbox invalid', () => {
      render(
        <CheckboxGroup
          label="L"
          options={options}
          helperText="Pick any"
          error
          errorMessage="Pick at least one"
        />,
      );
      expect(screen.getByRole('group')).toHaveAccessibleDescription('Pick at least one');
      for (const box of screen.getAllByRole('checkbox')) {
        expect(box).toHaveAttribute('aria-invalid', 'true');
      }
    });

    it('shows a required marker hidden from assistive technology', () => {
      render(<CheckboxGroup label="L" options={options} required />);
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('forwards the ref to the fieldset and merges className', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<CheckboxGroup ref={ref} label="L" options={options} className="extra" />);
    expect(ref.current?.tagName).toBe('FIELDSET');
    expect(ref.current).toHaveClass('axon-option-group', 'axon-checkbox-group', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <CheckboxGroup label="Plain" options={options} helperText="Hint" />
        <CheckboxGroup
          label="Error"
          options={options}
          required
          error
          errorMessage="Required"
          orientation="horizontal"
        />
        <CheckboxGroup label="Disabled" options={options} disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
