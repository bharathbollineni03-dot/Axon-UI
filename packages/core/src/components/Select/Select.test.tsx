import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Select, type SelectItem } from './Select';

const options: SelectItem[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana', description: 'Yellow' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'date', label: 'Date' },
];

const combobox = () => screen.getByRole('combobox');
const listbox = () => screen.getByRole('listbox');
const optionNamed = (name: string) => screen.getByRole('option', { name: new RegExp(name) });

describe('Select', () => {
  it('is a combobox named by its label, with a placeholder when empty', () => {
    render(<Select label="Fruit" options={options} placeholder="Choose…" />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger).toHaveTextContent('Choose…');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('forwards the ref to the button, puts className/style on the wrapper', () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <Select ref={ref} label="F" options={options} className="extra" style={{ margin: 3 }} />,
    );
    expect(ref.current).toBe(combobox());
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-select', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '3px' });
  });

  it('applies size, variant and color modifiers', () => {
    render(<Select label="F" options={options} size="lg" variant="filled" color="success" />);
    expect(combobox()).toHaveClass('axon-input--lg', 'axon-input--filled', 'axon-input--success');
  });

  describe('opening and choosing with the mouse', () => {
    it('opens on click and lists every option, linked through aria-controls', async () => {
      render(<Select label="F" options={options} />);
      await userEvent.setup().click(combobox());
      expect(combobox()).toHaveAttribute('aria-expanded', 'true');
      expect(combobox()).toHaveAttribute('aria-controls', listbox().id);
      expect(screen.getAllByRole('option')).toHaveLength(5);
      expect(listbox()).toHaveAccessibleName('F');
    });

    it('selects an option, closes and reports the change (uncontrolled)', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} onChange={onChange} />);
      await user.click(combobox());
      await user.click(optionNamed('Banana'));
      expect(onChange).toHaveBeenCalledWith('banana');
      expect(combobox()).toHaveTextContent('Banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox()).toHaveFocus();
    });

    it('starts from defaultValue and marks the selected option', async () => {
      render(<Select label="F" options={options} defaultValue="date" />);
      expect(combobox()).toHaveTextContent('Date');
      await userEvent.setup().click(combobox());
      expect(optionNamed('Date')).toHaveAttribute('aria-selected', 'true');
      expect(optionNamed('Apple')).toHaveAttribute('aria-selected', 'false');
    });

    it('does not select disabled options', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} onChange={onChange} />);
      await user.click(combobox());
      expect(optionNamed('Cherry')).toHaveAttribute('aria-disabled', 'true');
      await user.click(optionNamed('Cherry'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes on an outside press and when the trigger is pressed again', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button>outside</button>
          <Select label="F" options={options} />
        </>,
      );
      await user.click(combobox());
      await user.click(screen.getByRole('button', { name: 'outside' }));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.click(combobox());
      await user.click(combobox());
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows descriptions and group headings', async () => {
      render(
        <Select
          label="F"
          options={[
            { label: 'Citrus', options: [{ value: 'lemon', label: 'Lemon', description: 'Sour' }] },
            { label: 'Stone', options: [{ value: 'plum', label: 'Plum' }] },
          ]}
        />,
      );
      await userEvent.setup().click(combobox());
      expect(screen.getByRole('group', { name: 'Citrus' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Stone' })).toBeInTheDocument();
      expect(screen.getByText('Sour')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });
  });

  describe('controlled', () => {
    it('follows the value prop and reports requested changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} value="apple" onChange={onChange} />);
      await user.click(combobox());
      await user.click(optionNamed('Date'));
      expect(onChange).toHaveBeenCalledWith('date');
      expect(combobox()).toHaveTextContent('Apple');
    });

    it('works with parent state', async () => {
      function Parent() {
        const [value, setValue] = useState<string | null>(null);
        return (
          <>
            <Select label="F" options={options} value={value} onChange={setValue} />
            <output>{String(value)}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.click(combobox());
      await user.click(optionNamed('Apricot'));
      expect(screen.getByRole('status')).toHaveTextContent('apricot');
      expect(combobox()).toHaveTextContent('Apricot');
    });
  });

  describe('keyboard (select-only combobox pattern)', () => {
    it.each(['{ArrowDown}', '{ArrowUp}', '{Enter}', ' '])('opens with %s', async (key) => {
      const user = userEvent.setup();
      render(<Select label="F" options={options} />);
      combobox().focus();
      await user.keyboard(key);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('moves the active option with the arrow keys and exposes it through aria-activedescendant', async () => {
      const user = userEvent.setup();
      render(<Select label="F" options={options} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apple').id);
      await user.keyboard('{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apricot').id);
      await user.keyboard('{ArrowUp}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apple').id);
      expect(combobox()).toHaveFocus();
    });

    it('skips disabled options', async () => {
      const user = userEvent.setup();
      render(<Select label="F" options={options} defaultValue="banana" />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Date').id);
    });

    it('opens on the selected option and selects the active one with Enter', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} defaultValue="apricot" onChange={onChange} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apricot').id);
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledWith('banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selects with Space', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} onChange={onChange} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{ArrowDown} ');
      expect(onChange).toHaveBeenCalledWith('apricot');
    });

    it('jumps with Home and End', async () => {
      const user = userEvent.setup();
      render(<Select label="F" options={options} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{End}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Date').id);
      await user.keyboard('{Home}');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apple').id);
    });

    it('closes with Escape without changing the value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Select label="F" options={options} defaultValue="apple" onChange={onChange} />);
      combobox().focus();
      await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
      expect(combobox()).toHaveTextContent('Apple');
    });

    it('accepts the highlighted option on Tab and lets focus move on', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <>
          <Select label="F" options={options} onChange={onChange} />
          <button>next</button>
        </>,
      );
      combobox().focus();
      await user.keyboard('{ArrowDown}{ArrowDown}');
      await user.tab();
      expect(onChange).toHaveBeenCalledWith('apricot');
      expect(screen.getByRole('button', { name: 'next' })).toHaveFocus();
    });

    it('jumps to matching options by typing (typeahead)', async () => {
      const user = userEvent.setup();
      render(<Select label="F" options={options} />);
      combobox().focus();
      await user.keyboard('b');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Banana').id);
      await user.keyboard('{Escape}');
      await new Promise((resolve) => setTimeout(resolve, 600)); // let the typeahead buffer reset
      await user.keyboard('ap');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apple').id);
      await user.keyboard('r');
      expect(combobox()).toHaveAttribute('aria-activedescendant', optionNamed('Apricot').id);
    });
  });

  describe('field chrome', () => {
    it('describes the select with helper text, or the error message in the error state', () => {
      const { rerender } = render(<Select label="F" options={options} helperText="Pick one" />);
      expect(combobox()).toHaveAccessibleDescription('Pick one');
      rerender(
        <Select label="F" options={options} helperText="Pick one" error errorMessage="Required" />,
      );
      expect(combobox()).toHaveAccessibleDescription('Required');
      expect(combobox()).toHaveAttribute('aria-invalid', 'true');
    });

    it('marks required fields', () => {
      render(<Select label="F" options={options} required />);
      expect(combobox()).toHaveAttribute('aria-required', 'true');
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('submits the value through a hidden input when named', async () => {
      const user = userEvent.setup();
      const { container } = render(<Select label="F" options={options} name="fruit" />);
      const hidden = () => container.querySelector('input[type="hidden"]') as HTMLInputElement;
      expect(hidden().value).toBe('');
      await user.click(combobox());
      await user.click(optionNamed('Date'));
      expect(hidden()).toHaveAttribute('name', 'fruit');
      expect(hidden().value).toBe('date');
    });

    it('does not open when disabled', async () => {
      const { container } = render(<Select label="F" options={options} disabled />);
      expect(combobox()).toBeDisabled();
      expect(container.firstElementChild).toHaveClass('axon-field--disabled');
      await userEvent.setup().click(combobox());
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('says when there are no options', async () => {
      render(<Select label="F" options={[]} />);
      await userEvent.setup().click(combobox());
      expect(screen.getByRole('status')).toHaveTextContent('No options');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('renders the popup inside the closest .axon-root so theme variables apply', async () => {
    render(
      <div className="axon-root" data-testid="root" data-axon-theme="dark">
        <Select label="F" options={options} />
      </div>,
    );
    await userEvent.setup().click(combobox());
    expect(screen.getByTestId('root')).toContainElement(listbox());
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <Select label="Fruit" options={options} defaultValue="apple" helperText="Pick one" />
        <Select label="Required" options={options} required error errorMessage="Required" />
        <Select label="Disabled" options={options} disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    // The popup renders in a portal, so scan the whole body (minus the page-landmark rule).
    expect(await axe(baseElement, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });
});
