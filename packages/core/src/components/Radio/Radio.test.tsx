import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Radio } from './Radio';

describe('Radio', () => {
  it('is a radio named by its label', () => {
    render(<Radio value="a" label="Option A" />);
    expect(screen.getByRole('radio', { name: 'Option A' })).not.toBeChecked();
  });

  it('forwards the ref to the input, puts className/style on the label and spreads the rest', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <Radio
        ref={ref}
        value="a"
        label="A"
        className="extra"
        style={{ margin: 2 }}
        name="g"
        data-testid="r"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('r'));
    expect(ref.current).toHaveAttribute('name', 'g');
    expect(ref.current).toHaveAttribute('value', 'a');
    expect(container.firstElementChild).toHaveClass('axon-choice', 'axon-radio', 'extra');
    expect(container.firstElementChild).toHaveStyle({ margin: '2px' });
  });

  it('applies size and color modifiers', () => {
    const { container } = render(<Radio value="a" label="A" size="sm" color="secondary" />);
    expect(container.firstElementChild).toHaveClass('axon-radio--sm', 'axon-radio--secondary');
  });

  it('selects on click and calls onChange', async () => {
    const onChange = vi.fn();
    render(<Radio value="a" label="A" onChange={onChange} />);
    await userEvent.setup().click(screen.getByText('A'));
    expect(screen.getByRole('radio')).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('supports defaultChecked and a controlled checked prop', () => {
    const { rerender } = render(<Radio value="a" label="A" defaultChecked />);
    expect(screen.getByRole('radio')).toBeChecked();
    rerender(<Radio value="a" label="A" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('radio')).not.toBeChecked();
  });

  it('describes the radio with its description', () => {
    render(<Radio value="a" label="Pro" description="$10 per month" />);
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAccessibleDescription('$10 per month');
  });

  it('does not select when disabled', async () => {
    const { container } = render(<Radio value="a" label="A" disabled />);
    expect(screen.getByRole('radio')).toBeDisabled();
    expect(container.firstElementChild).toHaveClass('axon-choice--disabled');
    await userEvent.setup().click(screen.getByText('A'));
    expect(screen.getByRole('radio')).not.toBeChecked();
  });

  it('marks the error state', () => {
    const { container } = render(<Radio value="a" label="A" error />);
    expect(container.firstElementChild).toHaveClass('axon-radio--error', 'axon-choice--error');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div role="radiogroup" aria-label="Plan">
        <Radio name="p" value="a" label="A" />
        <Radio name="p" value="b" label="B" defaultChecked description="Hint" />
        <Radio name="p" value="c" label="C" disabled />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
