import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Divider } from './Divider';

describe('Divider', () => {
  it('is a horizontal separator (an hr) by default', () => {
    render(<Divider />);
    const divider = screen.getByRole('separator');
    expect(divider.tagName).toBe('HR');
    expect(divider).toHaveClass('axon-divider', 'axon-divider--horizontal', 'axon-divider--solid');
  });

  it('is a vertical separator with aria-orientation', () => {
    render(<Divider orientation="vertical" />);
    const divider = screen.getByRole('separator');
    expect(divider).toHaveAttribute('aria-orientation', 'vertical');
    expect(divider).toHaveClass('axon-divider--vertical');
  });

  it('supports a dashed variant and flexItem', () => {
    render(<Divider variant="dashed" orientation="vertical" flexItem />);
    expect(screen.getByRole('separator')).toHaveClass(
      'axon-divider--dashed',
      'axon-divider--flex-item',
    );
  });

  it('shows a label in the middle of a horizontal divider', () => {
    render(<Divider>or</Divider>);
    const divider = screen.getByRole('separator');
    expect(divider).toHaveTextContent('or');
    expect(divider).toHaveClass('axon-divider--labelled');
    expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('can be decorative, hiding the separator role', () => {
    const { container, rerender } = render(<Divider decorative />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(container.querySelector('hr')).toHaveAttribute('role', 'presentation');
    rerender(<Divider orientation="vertical" decorative />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLElement>();
    render(<Divider ref={ref} className="extra" data-testid="d" />);
    expect(ref.current).toBe(screen.getByTestId('d'));
    expect(ref.current).toHaveClass('axon-divider', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Divider />
        <Divider>or</Divider>
        <div style={{ display: 'flex' }}>
          <Divider orientation="vertical" />
        </div>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
