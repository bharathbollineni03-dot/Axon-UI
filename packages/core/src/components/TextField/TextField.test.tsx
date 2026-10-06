import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  it('links the label to the input and marks required fields', () => {
    render(<TextField label="Email" required />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards the ref to the input, puts className/style on the root and spreads the rest on the input', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <TextField
        ref={ref}
        className="extra"
        style={{ margin: 4 }}
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        data-testid="input"
      />,
    );
    const input = screen.getByTestId('input');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
    expect(input).toHaveAttribute('autocomplete', 'email');
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('axon-field', 'axon-text-field', 'extra');
    expect(root).toHaveStyle({ margin: '4px' });
  });

  it('applies size, variant and color modifiers to the input box', () => {
    const { container } = render(<TextField size="lg" variant="filled" color="success" />);
    expect(container.querySelector('.axon-input')).toHaveClass(
      'axon-input--lg',
      'axon-input--filled',
      'axon-input--success',
    );
  });

  it.each(['text', 'email', 'password', 'number', 'search', 'tel', 'url'] as const)(
    'supports type=%s',
    (type) => {
      const { container } = render(<TextField type={type} aria-label="Field" />);
      expect(container.querySelector('input')).toHaveAttribute('type', type);
    },
  );

  describe('uncontrolled', () => {
    it('updates as the user types and starts from defaultValue', async () => {
      const onChange = vi.fn();
      render(<TextField aria-label="Name" defaultValue="Ada" onChange={onChange} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('Ada');
      await userEvent.setup().type(input, ' Lovelace');
      expect(input).toHaveValue('Ada Lovelace');
      expect(onChange).toHaveBeenCalledTimes(' Lovelace'.length);
    });
  });

  describe('controlled', () => {
    it('shows the value prop and reports changes', async () => {
      const onChange = vi.fn();
      render(<TextField aria-label="Name" value="fixed" onChange={onChange} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('fixed');
      await userEvent.setup().type(input, 'x');
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(input).toHaveValue('fixed');
    });

    it('works with state in a parent', async () => {
      function Parent() {
        const [value, setValue] = useState('');
        return (
          <>
            <TextField aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
            <output>{value}</output>
          </>
        );
      }
      render(<Parent />);
      await userEvent.setup().type(screen.getByRole('textbox'), 'abc');
      expect(screen.getByRole('status')).toHaveTextContent('abc');
    });
  });

  describe('helper text and errors', () => {
    it('describes the input with the helper text', () => {
      render(<TextField label="Name" helperText="As on your ID" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAccessibleDescription('As on your ID');
      expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('shows the error message instead of the helper text and marks the input invalid', () => {
      render(<TextField label="Name" helperText="As on your ID" error errorMessage="Required" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Required');
      expect(screen.queryByText('As on your ID')).not.toBeInTheDocument();
    });

    it('falls back to the helper text when error has no message', () => {
      render(<TextField label="Name" helperText="Hint" error />);
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Hint');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('ignores errorMessage while error is false', () => {
      render(<TextField label="Name" helperText="Hint" errorMessage="Nope" />);
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Hint');
    });

    it('keeps a live region for messages and merges a custom aria-describedby', () => {
      render(
        <>
          <p id="extra">Extra context</p>
          <TextField label="Name" helperText="Hint" aria-describedby="extra" />
        </>,
      );
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Extra context Hint');
      expect(screen.getByText('Hint')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('adornments', () => {
    it('renders start and end adornments', () => {
      render(
        <TextField
          aria-label="Price"
          startAdornment={<span data-testid="start">$</span>}
          endAdornment={<span data-testid="end">USD</span>}
        />,
      );
      expect(screen.getByTestId('start')).toBeInTheDocument();
      expect(screen.getByTestId('end')).toBeInTheDocument();
    });

    it('focuses the input when the box (outside the input) is pressed', async () => {
      render(<TextField aria-label="Price" startAdornment={<span data-testid="start">$</span>} />);
      await userEvent.setup().click(screen.getByTestId('start'));
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('clearable', () => {
    it('shows the clear button only when there is a value', async () => {
      render(<TextField aria-label="Search" clearable />);
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
      await userEvent.setup().type(screen.getByRole('textbox'), 'abc');
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });

    it('clears an uncontrolled field, refocuses it and calls onClear and onChange', async () => {
      const onClear = vi.fn();
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <TextField
          aria-label="Search"
          clearable
          defaultValue="abc"
          onClear={onClear}
          onChange={onChange}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Clear' }));
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getByRole('textbox')).toHaveFocus();
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });

    it('clears a controlled field through onChange', async () => {
      function Parent() {
        const [value, setValue] = useState('hello');
        return (
          <TextField
            aria-label="Search"
            clearable
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      }
      render(<Parent />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Clear' }));
      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('does not show the clear button when disabled or read-only', () => {
      const { rerender } = render(<TextField aria-label="S" clearable defaultValue="x" disabled />);
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
      rerender(<TextField aria-label="S" clearable defaultValue="x" readOnly />);
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });
  });

  describe('password', () => {
    it('toggles visibility with a labelled, pressed-state button', async () => {
      const user = userEvent.setup();
      const { container } = render(<TextField type="password" aria-label="Password" />);
      const input = container.querySelector('input')!;
      expect(input).toHaveAttribute('type', 'password');

      await user.click(screen.getByRole('button', { name: 'Show password' }));
      expect(input).toHaveAttribute('type', 'text');
      const hide = screen.getByRole('button', { name: 'Hide password' });
      expect(hide).toHaveAttribute('aria-pressed', 'true');

      await user.click(hide);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('supports custom toggle labels and does not add a toggle to other types', () => {
      const { rerender } = render(
        <TextField type="password" aria-label="P" showPasswordLabel="Mostrar" />,
      );
      expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
      rerender(<TextField type="text" aria-label="P" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('character counter', () => {
    it('counts characters and shows the limit when maxLength is set', async () => {
      render(<TextField label="Bio" showCount maxLength={10} defaultValue="abc" />);
      expect(screen.getByText('3 / 10')).toBeInTheDocument();
      await userEvent.setup().type(screen.getByRole('textbox'), 'de');
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('shows only the count without maxLength and follows a controlled value', () => {
      const { rerender } = render(
        <TextField aria-label="Bio" showCount value="abcd" onChange={() => {}} />,
      );
      expect(screen.getByText('4')).toBeInTheDocument();
      rerender(<TextField aria-label="Bio" showCount value="ab" onChange={() => {}} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('is included in the input description', () => {
      render(<TextField label="Bio" showCount maxLength={10} defaultValue="abc" />);
      expect(screen.getByRole('textbox')).toHaveAccessibleDescription('3 / 10');
    });
  });

  describe('disabled and read-only', () => {
    it('disables the input and styles the field', () => {
      const { container } = render(<TextField label="Name" disabled />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
      expect(container.firstElementChild).toHaveClass('axon-field--disabled');
      expect(container.querySelector('.axon-input')).toHaveClass('axon-input--disabled');
    });

    it('does not change a read-only field', async () => {
      render(<TextField aria-label="Id" readOnly defaultValue="42" />);
      await userEvent.setup().type(screen.getByRole('textbox'), 'x');
      expect(screen.getByRole('textbox')).toHaveValue('42');
    });
  });

  it('supports fullWidth', () => {
    const { container } = render(<TextField aria-label="Wide" fullWidth />);
    expect(container.firstElementChild).toHaveClass('axon-field--full-width');
  });

  it('keeps native keyboard behavior: Tab moves focus through the input and its buttons', async () => {
    const user = userEvent.setup();
    render(<TextField type="password" aria-label="Password" defaultValue="x" clearable />);
    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus();
  });

  describe('accessibility', () => {
    it('has no violations in the default, error, disabled and decorated states', async () => {
      const { container } = render(
        <div>
          <TextField label="Name" helperText="Helper" />
          <TextField label="Email" required error errorMessage="Invalid" />
          <TextField label="Locked" disabled />
          <TextField
            label="Password"
            type="password"
            clearable
            showCount
            maxLength={20}
            defaultValue="secret"
            startAdornment={<span aria-hidden="true">🔒</span>}
          />
        </div>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
