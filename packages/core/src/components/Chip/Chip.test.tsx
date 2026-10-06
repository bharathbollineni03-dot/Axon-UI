import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Chip, Tag } from './Chip';

describe('Chip', () => {
  it('renders its label (or children) as plain, non-interactive text', () => {
    const { rerender } = render(<Chip label="React" />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<Chip>TypeScript</Chip>);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('applies variant, size and color modifiers', () => {
    render(<Chip label="x" variant="outline" size="sm" color="success" data-testid="c" />);
    expect(screen.getByTestId('c')).toHaveClass(
      'axon-chip',
      'axon-chip--outline',
      'axon-chip--sm',
      'axon-chip--success',
    );
  });

  it('defaults to a subtle neutral chip', () => {
    render(<Chip label="x" data-testid="c" />);
    expect(screen.getByTestId('c')).toHaveClass(
      'axon-chip--subtle',
      'axon-chip--md',
      'axon-chip--neutral',
    );
  });

  it('shows a decorative icon', () => {
    render(<Chip label="Tagged" icon={<svg data-testid="i" />} />);
    expect(screen.getByTestId('i').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards the ref, merges className and spreads props', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Chip ref={ref} label="x" className="extra" data-testid="c" />);
    expect(ref.current).toBe(screen.getByTestId('c'));
    expect(ref.current).toHaveClass('axon-chip', 'extra');
  });

  describe('clickable', () => {
    it('becomes a button and responds to click, Enter and Space', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<Chip label="Filter" onClick={onClick} />);
      const chip = screen.getByRole('button', { name: 'Filter' });
      await user.click(chip);
      chip.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('exposes its on/off state with aria-pressed', () => {
      const { rerender } = render(<Chip label="Filter" onClick={() => {}} selected />);
      expect(screen.getByRole('button', { name: 'Filter' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      rerender(<Chip label="Filter" onClick={() => {}} selected={false} />);
      expect(screen.getByRole('button', { name: 'Filter' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      rerender(<Chip label="Filter" onClick={() => {}} />);
      expect(screen.getByRole('button', { name: 'Filter' })).not.toHaveAttribute('aria-pressed');
    });
  });

  describe('removable', () => {
    it('shows a labelled remove button that calls onDelete', async () => {
      const onDelete = vi.fn();
      render(<Chip label="React" onDelete={onDelete} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Remove React' }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('supports a custom remove label and a non-text label', () => {
      const { rerender } = render(
        <Chip label="React" onDelete={() => {}} deleteLabel="Quitar React" />,
      );
      expect(screen.getByRole('button', { name: 'Quitar React' })).toBeInTheDocument();
      rerender(<Chip label={<b>React</b>} onDelete={() => {}} />);
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('removes with Backspace or Delete while focus is inside the chip', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<Chip label="React" onClick={() => {}} onDelete={onDelete} />);
      screen.getByRole('button', { name: 'React' }).focus();
      await user.keyboard('{Backspace}');
      await user.keyboard('{Delete}');
      expect(onDelete).toHaveBeenCalledTimes(2);
    });

    it('keeps clicking the chip separate from removing it', async () => {
      const onClick = vi.fn();
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<Chip label="React" onClick={onClick} onDelete={onDelete} />);
      await user.click(screen.getByRole('button', { name: 'React' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onDelete).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Remove React' }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  it('disables its buttons and ignores keys when disabled', async () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<Chip label="React" onClick={onClick} onDelete={onDelete} disabled data-testid="c" />);
    expect(screen.getByRole('button', { name: 'React' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove React' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'React' }));
    await user.keyboard('{Backspace}');
    expect(onClick).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId('c')).toHaveClass('axon-chip--disabled');
  });

  it('exports Tag as the same component', () => {
    expect(Tag).toBe(Chip);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Chip label="Plain" />
        <Chip label="Clickable" onClick={() => {}} selected />
        <Chip label="Removable" onDelete={() => {}} variant="solid" color="primary" />
        <Chip label="Outline" variant="outline" color="success" />
        <Chip label="Disabled" disabled onClick={() => {}} />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
