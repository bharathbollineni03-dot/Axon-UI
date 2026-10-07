import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title as a level 3 heading by default', () => {
    render(<EmptyState title="No projects yet" />);
    expect(screen.getByRole('heading', { level: 3, name: 'No projects yet' })).toBeInTheDocument();
  });

  it.each(['h2', 'h4', 'h5', 'h6'] as const)('renders the title as %s when asked', (tag) => {
    render(<EmptyState title="Nothing here" titleAs={tag} />);
    expect(screen.getByRole('heading', { level: Number(tag[1]) })).toBeInTheDocument();
  });

  it('can render the title without a heading', () => {
    render(<EmptyState title="Nothing here" titleAs="p" />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders the description, children and action in that order', () => {
    render(
      <EmptyState
        title="No results"
        description="Try a different search."
        action={<button>Clear filters</button>}
        data-testid="e"
      >
        <span>Extra hint</span>
      </EmptyState>,
    );
    const text = screen.getByTestId('e').textContent;
    expect(text).toBe('No resultsTry a different search.Extra hintClear filters');
  });

  it('omits the parts that are not given', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('.axon-empty-state__icon')).not.toBeInTheDocument();
    expect(container.querySelector('.axon-empty-state__description')).not.toBeInTheDocument();
    expect(container.querySelector('.axon-empty-state__action')).not.toBeInTheDocument();
  });

  it('shows a decorative icon', () => {
    render(<EmptyState title="Empty" icon={<svg data-testid="i" />} />);
    expect(screen.getByTestId('i').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('makes the action usable', async () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={<button onClick={onClick}>Create project</button>} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Create project' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the size modifier, defaulting to medium', () => {
    const { rerender } = render(<EmptyState title="Empty" data-testid="e" />);
    expect(screen.getByTestId('e')).toHaveClass('axon-empty-state', 'axon-empty-state--md');
    rerender(<EmptyState title="Empty" size="lg" data-testid="e" />);
    expect(screen.getByTestId('e')).toHaveClass('axon-empty-state--lg');
  });

  it('forwards the ref, merges className and spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(<EmptyState ref={ref} title="Empty" className="extra" data-testid="e" />);
    expect(ref.current).toBe(screen.getByTestId('e'));
    expect(ref.current).toHaveClass('axon-empty-state', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <main>
        <EmptyState
          icon={<svg viewBox="0 0 24 24" />}
          title="No messages"
          description="When someone writes to you, it shows up here."
          action={<button>Compose</button>}
        />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
