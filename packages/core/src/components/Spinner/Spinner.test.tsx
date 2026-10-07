import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('is a status region labelled "Loading"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('supports a custom label', () => {
    render(<Spinner label="Saving your changes" />);
    expect(screen.getByRole('status')).toHaveTextContent('Saving your changes');
  });

  it('keeps the drawing out of the accessibility tree', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('can be decorative: no role, no label, hidden from assistive technology', () => {
    const { container } = render(<Spinner decorative />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveTextContent('');
  });

  it('defaults to a medium primary spinner', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveClass(
      'axon-spinner',
      'axon-spinner--md',
      'axon-spinner--primary',
    );
  });

  it('applies size and color modifiers, including inherit', () => {
    const { rerender } = render(<Spinner size="lg" color="danger" />);
    expect(screen.getByRole('status')).toHaveClass('axon-spinner--lg', 'axon-spinner--danger');
    rerender(<Spinner size="sm" color="inherit" />);
    expect(screen.getByRole('status')).toHaveClass('axon-spinner--sm', 'axon-spinner--inherit');
  });

  it('forwards the ref, merges className and spreads props', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} className="extra" data-testid="s" />);
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveClass('axon-spinner', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Spinner />
        <Spinner decorative />
        <button aria-busy="true">
          Saving <Spinner size="sm" color="inherit" decorative />
        </button>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
