import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from './MultiSelect';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'angular', label: 'Angular', disabled: true },
];

const combobox = () => screen.getByRole('combobox');
const optionNamed = (name: string) => screen.getByRole('option', { name: new RegExp(`^${name}`) });

describe('MultiSelect', () => {
  it('is a combobox named by its label, with a placeholder when empty', () => {
    render(<MultiSelect label="Stack" options={options} placeholder="Pick some…" />);
    expect(screen.getByRole('combobox', { name: 'Stack' })).toHaveTextContent('Pick some…');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('forwards the ref to the button, puts className/style on the wrapper', () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <MultiSelect ref={ref} label="S" options={options} className="extra" style={{ margin: 2 }} />,
    );
    expect(ref.current).toBe(combobox());
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-multi-select', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  describe('selecting with the mouse', () => {
    it('keeps the list open, marks selections and shows chips in the order chosen', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} onChange={onChange} />);
      await user.click(combobox());
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
      await user.click(optionNamed('Vue'));
      await user.click(optionNamed('React'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith(['vue', 'react']);
      expect(optionNamed('Vue')).toHaveAttribute('aria-selected', 'true');
      expect(optionNamed('Svelte')).toHaveAttribute('aria-selected', 'false');
      const chips = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(chips).toEqual(['Vue', 'React']);
    });

    it('deselects by clicking a selected option again', async () => {
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} defaultValue={['react']} />);
      await user.click(combobox());
      await user.click(optionNamed('React'));
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('ignores disabled options', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} onChange={onChange} />);
      await user.click(combobox());
      await user.click(optionNamed('Angular'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('closes on an outside press', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>outside</button>
          <MultiSelect label="S" options={options} />
        </>,
      );
      await user.click(combobox());
      await user.click(screen.getByRole('button', { name: 'outside' }));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('chips', () => {
    it('removes a value with its remove button and refocuses the combobox', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="S"
          options={options}
          defaultValue={['react', 'vue']}
          onChange={onChange}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Remove React' }));
      expect(onChange).toHaveBeenCalledWith(['vue']);
      expect(screen.queryByRole('button', { name: 'Remove React' })).not.toBeInTheDocument();
      expect(combobox()).toHaveFocus();
    });

    it('describes the combobox with the selected chips', () => {
      render(<MultiSelect label="S" options={options} defaultValue={['react', 'vue']} />);
      expect(combobox()).toHaveAccessibleDescription('React Vue');
    });

    it('has no remove buttons when disabled', () => {
      render(<MultiSelect label="S" options={options} defaultValue={['react']} disabled />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove React' })).not.toBeInTheDocument();
      expect(combobox()).toBeDisabled();
    });

    it('removes the last chip with Backspace', async () => {
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} defaultValue={['react', 'vue']} />);
      combobox().focus();
      await user.keyboard('{Backspace}');
      expect(screen.queryByText('Vue')).not.toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it.each(['{ArrowDown}', '{ArrowUp}', '{Enter}', ' '])('opens with %s', async (key) => {
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} />);
      combobox().focus();
      await user.keyboard(key);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('moves with the arrows (skipping disabled), toggles with Enter and Space and stays open', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} onChange={onChange} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('React').id);
      await user.keyboard('{Enter}{ArrowDown} ');
      expect(onChange).toHaveBeenLastCalledWith(['react', 'vue']);
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Svelte').id);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenLastCalledWith(['react', 'vue', 'svelte']);
    });

    it('jumps with Home and End and types ahead', async () => {
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{End}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Svelte').id);
      await user.keyboard('{Home}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('React').id);
      await user.keyboard('v');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Vue').id);
    });

    it('closes with Escape and keeps the selection', async () => {
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} defaultValue={['vue']} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.getByText('Vue')).toBeInTheDocument();
    });
  });

  describe('select all', () => {
    it('adds a Select all option that selects every enabled option and then clears them', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} selectAll onChange={onChange} />);
      await user.click(combobox());
      await user.click(optionNamed('Select all'));
      expect(onChange).toHaveBeenLastCalledWith(['react', 'vue', 'svelte']);
      expect(optionNamed('Select all')).toHaveAttribute('aria-selected', 'true');
      await user.click(optionNamed('Select all'));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('is only partly marked when some options are selected, and supports custom text', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect label="S" options={options} selectAll="Everything" defaultValue={['vue']} />,
      );
      await user.click(combobox());
      expect(optionNamed('Everything')).toHaveAttribute('aria-selected', 'false');
      await user.click(optionNamed('Everything'));
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('keeps disabled selected values when deselecting all', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          label="S"
          options={options}
          selectAll
          defaultValue={['react', 'vue', 'svelte', 'angular']}
        />,
      );
      await user.click(combobox());
      await user.click(optionNamed('Select all'));
      expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Angular']);
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<MultiSelect label="S" options={options} value={['react']} onChange={onChange} />);
      await user.click(combobox());
      await user.click(optionNamed('Vue'));
      expect(onChange).toHaveBeenCalledWith(['react', 'vue']);
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState<string[]>([]);
        return (
          <>
            <MultiSelect label="S" options={options} value={value} onChange={setValue} />
            <output>{value.join(',')}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(combobox());
      await user.click(optionNamed('Svelte'));
      await user.click(optionNamed('React'));
      expect(screen.getByRole('status')).toHaveTextContent('svelte,react');
    });
  });

  it('clears everything with the clear button', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiSelect
        label="S"
        options={options}
        clearable
        defaultValue={['react', 'vue']}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('submits one hidden input per value when named', () => {
    const { container } = render(
      <MultiSelect label="S" options={options} name="stack" defaultValue={['react', 'vue']} />,
    );
    const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];
    expect(hidden.map((h) => `${h.name}=${h.value}`)).toEqual(['stack=react', 'stack=vue']);
  });

  it('describes the field with helper or error text and marks required', () => {
    const { rerender } = render(
      <MultiSelect label="S" options={options} helperText="Pick any" required />,
    );
    expect(combobox()).toHaveAccessibleDescription('Pick any');
    expect(combobox()).toHaveAttribute('aria-required', 'true');
    rerender(
      <MultiSelect
        label="S"
        options={options}
        helperText="Pick any"
        error
        errorMessage="Need one"
      />,
    );
    expect(combobox()).toHaveAccessibleDescription('Need one');
    expect(combobox()).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not open when disabled and says when there are no options', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MultiSelect label="S" options={options} disabled />);
    await user.click(combobox());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<MultiSelect label="S" options={[]} />);
    await user.click(combobox());
    expect(screen.getByRole('status')).toHaveTextContent('No options');
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <MultiSelect label="Stack" options={options} defaultValue={['react']} selectAll clearable />
        <MultiSelect label="Error" options={options} error errorMessage="Required" required />
        <MultiSelect label="Disabled" options={options} disabled defaultValue={['vue']} />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('combobox', { name: 'Stack' }));
    expect(await axe(baseElement, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });
});
