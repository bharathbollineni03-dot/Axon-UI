import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Autocomplete } from './Autocomplete';

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'apricot', label: 'Apricot' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'crème', label: 'Crème brûlée' },
];

const input = () => screen.getByRole('combobox');
// Matches on text content: jsdom splits the accessible name around the highlighted <span>.
const optionNamed = (name: string) => {
  const match = screen.getAllByRole('option').find((o) => o.textContent?.startsWith(name));
  if (!match) throw new Error(`No option starting with "${name}"`);
  return match;
};
const optionLabels = () => screen.queryAllByRole('option').map((o) => o.textContent);

describe('Autocomplete', () => {
  it('is an editable combobox named by its label', () => {
    render(<Autocomplete label="Fruit" options={options} placeholder="Search…" />);
    const el = screen.getByRole('combobox', { name: 'Fruit' });
    expect(el).toHaveAttribute('aria-autocomplete', 'list');
    expect(el).toHaveAttribute('aria-expanded', 'false');
    expect(el).toHaveAttribute('placeholder', 'Search…');
    expect(el).toHaveAttribute('autocomplete', 'off');
  });

  it('forwards the ref to the input, puts className/style on the wrapper and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Autocomplete
        ref={ref}
        label="F"
        options={options}
        className="extra"
        style={{ margin: 2 }}
        name="fruit"
      />,
    );
    expect(ref.current).toBe(input());
    expect(input()).toHaveAttribute('name', 'fruit');
    expect(container.firstElementChild).toHaveClass('axon-field', 'axon-autocomplete', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  describe('filtering', () => {
    it('opens on typing and filters options case- and accent-insensitively', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} />);
      await user.type(input(), 'AP');
      expect(optionLabels()).toEqual(['Apple', 'Apricot']);
      expect(input()).toHaveAttribute('aria-expanded', 'true');
      await user.clear(input());
      await user.type(input(), 'creme');
      expect(optionLabels()).toEqual(['Crème brûlée']);
    });

    it('highlights the matching text', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Autocomplete label="F" options={options} />);
      await user.type(input(), 'an');
      expect(document.querySelector('.axon-listbox__match')).toHaveTextContent('an');
      rerender(<Autocomplete label="F" options={options} highlightMatches={false} />);
      expect(document.querySelector('.axon-listbox__match')).toBeNull();
    });

    it('shows a no-options message when nothing matches', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} noOptionsText="Nothing here" />);
      await user.type(input(), 'zzz');
      expect(screen.getByRole('status')).toHaveTextContent('Nothing here');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(input()).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports a custom filter and filtering off', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Autocomplete
          label="F"
          options={options}
          filterOptions={(o, q) => o.value.startsWith(q)}
        />,
      );
      await user.type(input(), 'ban');
      expect(optionLabels()).toEqual(['Banana']);
      rerender(<Autocomplete label="F" options={options} filterOptions={false} />);
      expect(optionLabels()).toHaveLength(5);
    });

    it('filters grouped options and drops empty groups', async () => {
      const user = userEvent.setup();
      render(
        <Autocomplete
          label="F"
          options={[
            { label: 'Citrus', options: [{ value: 'lemon', label: 'Lemon' }] },
            { label: 'Stone', options: [{ value: 'plum', label: 'Plum' }] },
          ]}
        />,
      );
      await user.type(input(), 'plu');
      expect(screen.getByRole('group', { name: 'Stone' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Citrus' })).not.toBeInTheDocument();
    });
  });

  describe('selecting', () => {
    it('selects with the mouse: fills the input, reports value and option, closes', async () => {
      const onChange = vi.fn();
      const onInputChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Autocomplete
          label="F"
          options={options}
          onChange={onChange}
          onInputChange={onInputChange}
        />,
      );
      await user.type(input(), 'ban');
      await user.click(optionNamed('Banana'));
      expect(onChange).toHaveBeenCalledWith('banana', options[2]);
      expect(onInputChange).toHaveBeenLastCalledWith('Banana', 'select');
      expect(input()).toHaveValue('Banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(input()).toHaveFocus();
    });

    it('selects with ArrowDown and Enter, exposing the active option through aria-activedescendant', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} onChange={onChange} />);
      await user.type(input(), 'ap');
      expect(input()).not.toHaveAttribute('aria-activedescendant');
      await user.keyboard('{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', optionNamed('Apple').id);
      await user.keyboard('{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', optionNamed('Apricot').id);
      await user.keyboard('{ArrowUp}{Enter}');
      expect(onChange).toHaveBeenCalledWith('apple', options[0]);
      expect(input()).toHaveValue('Apple');
      expect(input()).toHaveFocus();
    });

    it('opens with ArrowDown, skips disabled options and wraps ArrowUp to the last option', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} />);
      input().focus();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      expect(input()).toHaveAttribute('aria-activedescendant', optionNamed('Crème').id);
      await user.keyboard('{Escape}{ArrowUp}');
      expect(input()).toHaveAttribute('aria-activedescendant', optionNamed('Crème').id);
    });

    it('does not select disabled options', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} onChange={onChange} />);
      await user.click(input());
      await user.click(optionNamed('Cherry'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('starts from defaultValue showing its label and marks it selected', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} defaultValue="banana" />);
      expect(input()).toHaveValue('Banana');
      await user.click(input());
      expect(optionLabels()).toHaveLength(5); // not filtered by the selected text
      expect(optionNamed('Banana')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Escape, blur and clearing', () => {
    it('Escape closes the list, and a second Escape clears the input', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Autocomplete label="F" options={options} defaultValue="banana" onChange={onChange} />,
      );
      await user.click(input());
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(input()).toHaveValue('Banana');
      await user.keyboard('{Escape}');
      expect(input()).toHaveValue('');
      expect(onChange).toHaveBeenCalledWith(null, null);
    });

    it('restores the selected label when the user leaves with unfinished text', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} defaultValue="banana" />);
      await user.click(input());
      await user.type(input(), 'xyz');
      await user.tab();
      expect(input()).toHaveValue('Banana');
    });

    it('empties the input when leaving with text and no selection', async () => {
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} />);
      await user.type(input(), 'app');
      await user.tab();
      expect(input()).toHaveValue('');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('clears the value when the user empties the input', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Autocomplete label="F" options={options} defaultValue="banana" onChange={onChange} />,
      );
      await user.clear(input());
      expect(onChange).toHaveBeenCalledWith(null, null);
    });

    it('has a clear button when clearable', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Autocomplete
          label="F"
          options={options}
          clearable
          defaultValue="apple"
          onChange={onChange}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(input()).toHaveValue('');
      expect(input()).toHaveFocus();
      expect(onChange).toHaveBeenCalledWith(null, null);
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });
  });

  describe('free text (freeSolo)', () => {
    it('accepts typed text as the value on Enter', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} freeSolo onChange={onChange} />);
      await user.type(input(), 'Kiwi{Enter}');
      expect(onChange).toHaveBeenCalledWith('Kiwi', { value: 'Kiwi', label: 'Kiwi' });
    });

    it('commits typed text on blur and keeps it', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} freeSolo onChange={onChange} />);
      await user.type(input(), 'Kiwi');
      await user.tab();
      expect(onChange).toHaveBeenCalledWith('Kiwi', { value: 'Kiwi', label: 'Kiwi' });
      expect(input()).toHaveValue('Kiwi');
    });

    it('still lets the user pick a listed option and does not complain about no matches', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Autocomplete label="F" options={options} freeSolo onChange={onChange} />);
      await user.type(input(), 'zzz');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      await user.clear(input());
      await user.type(input(), 'ban');
      await user.click(optionNamed('Banana'));
      expect(onChange).toHaveBeenLastCalledWith('banana', options[2]);
    });
  });

  describe('async options', () => {
    it('loads options for the typed query after a debounce, with a loading status', async () => {
      let resolve: (items: typeof options) => void = () => {};
      const loadOptions = vi.fn(
        () =>
          new Promise<typeof options>((r) => {
            resolve = r;
          }),
      );
      const user = userEvent.setup();
      render(
        <Autocomplete
          label="F"
          loadOptions={loadOptions}
          debounceMs={20}
          loadingText="Searching…"
        />,
      );
      await user.type(input(), 'ap');
      await waitFor(() =>
        expect(loadOptions).toHaveBeenLastCalledWith('ap', expect.any(AbortSignal)),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Searching…');
      resolve([options[0]!, options[1]!]);
      await waitFor(() => expect(optionLabels()).toEqual(['Apple', 'Apricot']));
      expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
    });

    it('does not filter loaded results on the client', async () => {
      const loadOptions = vi.fn(async () => [{ value: 'x', label: 'Totally unrelated' }]);
      const user = userEvent.setup();
      render(<Autocomplete label="F" loadOptions={loadOptions} debounceMs={0} />);
      await user.type(input(), 'ap');
      await waitFor(() => expect(optionLabels()).toEqual(['Totally unrelated']));
    });

    it('debounces rapid typing into a single request and aborts a superseded one', async () => {
      const signals: AbortSignal[] = [];
      const loadOptions = vi.fn((_: string, signal: AbortSignal) => {
        signals.push(signal);
        return new Promise<typeof options>(() => {});
      });
      const user = userEvent.setup();
      render(<Autocomplete label="F" loadOptions={loadOptions} debounceMs={60} />);
      await user.type(input(), 'abc');
      await waitFor(() =>
        expect(loadOptions).toHaveBeenLastCalledWith('abc', expect.any(AbortSignal)),
      );
      const callsForAbc = loadOptions.mock.calls.filter(([q]) => q === 'abc').length;
      expect(callsForAbc).toBe(1);
      await user.type(input(), 'd');
      await waitFor(() =>
        expect(loadOptions).toHaveBeenLastCalledWith('abcd', expect.any(AbortSignal)),
      );
      expect(signals.slice(0, -1).every((s) => s.aborted)).toBe(true);
    });

    it('reports a load failure', async () => {
      const loadOptions = vi.fn(async () => {
        throw new Error('network');
      });
      const user = userEvent.setup();
      render(
        <Autocomplete label="F" loadOptions={loadOptions} debounceMs={0} loadErrorText="Oops" />,
      );
      await user.type(input(), 'a');
      expect(await screen.findByText('Oops')).toBeInTheDocument();
    });

    it('keeps the selected label when the loaded options change', async () => {
      const loadOptions = vi.fn(async (query: string) =>
        query === 'ap' ? [options[0]!] : [options[2]!],
      );
      const user = userEvent.setup();
      render(<Autocomplete label="F" loadOptions={loadOptions} debounceMs={0} />);
      await user.type(input(), 'ap');
      await screen.findByRole('option');
      await user.click(optionNamed('Apple'));
      expect(input()).toHaveValue('Apple');
      await user.type(input(), '{Backspace}{Backspace}');
      await user.tab();
      expect(input()).toHaveValue('Apple');
    });
  });

  describe('controlled', () => {
    it('follows value and inputValue props', async () => {
      const onChange = vi.fn();
      const onInputChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Autocomplete
          label="F"
          options={options}
          value="apple"
          inputValue="App"
          onChange={onChange}
          onInputChange={onInputChange}
        />,
      );
      expect(input()).toHaveValue('App');
      await user.type(input(), 'l');
      expect(onInputChange).toHaveBeenCalledWith('Appl', 'input');
      expect(input()).toHaveValue('App');
    });

    it('works with parent state, including external resets', async () => {
      function Parent() {
        const [value, setValue] = useState<string | null>(null);
        return (
          <>
            <Autocomplete label="F" options={options} value={value} onChange={(v) => setValue(v)} />
            <button onClick={() => setValue('banana')}>set banana</button>
            <output>{String(value)}</output>
          </>
        );
      }
      const user = userEvent.setup();
      render(<Parent />);
      await user.type(input(), 'apr');
      await user.click(optionNamed('Apricot'));
      expect(screen.getByRole('status')).toHaveTextContent('apricot');
      await user.click(screen.getByRole('button', { name: 'set banana' }));
      expect(input()).toHaveValue('Banana');
    });
  });

  it('describes the field with helper or error text and marks invalid/required', () => {
    const { rerender } = render(
      <Autocomplete label="F" options={options} helperText="Type to search" required />,
    );
    expect(input()).toHaveAccessibleDescription('Type to search');
    expect(input()).toBeRequired();
    rerender(
      <Autocomplete label="F" options={options} helperText="x" error errorMessage="Pick a fruit" />,
    );
    expect(input()).toHaveAccessibleDescription('Pick a fruit');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not open when disabled or read-only', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Autocomplete label="F" options={options} disabled />);
    expect(input()).toBeDisabled();
    rerender(<Autocomplete label="F" options={options} readOnly />);
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has no accessibility violations closed or open', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <div>
        <Autocomplete
          label="Fruit"
          options={options}
          helperText="Type to search"
          clearable
          defaultValue="apple"
        />
        <Autocomplete label="Error" options={options} error errorMessage="Required" required />
        <Autocomplete label="Disabled" options={options} disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    expect(await axe(baseElement, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });
});
