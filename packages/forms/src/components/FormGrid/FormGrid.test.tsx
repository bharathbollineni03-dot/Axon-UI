import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormGrid, FormGridItem } from './FormGrid';

describe('FormGrid', () => {
  it('renders its children in a grid', () => {
    render(
      <FormGrid data-testid="grid">
        <input aria-label="First" />
        <input aria-label="Last" />
      </FormGrid>,
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('axon-grid');
    expect(grid).toContainElement(screen.getByLabelText('First'));
    expect(grid).toContainElement(screen.getByLabelText('Last'));
  });

  it('is one column on small screens and `columns` from sm up', () => {
    render(<FormGrid data-testid="grid" columns={3} />);
    const style = screen.getByTestId('grid').getAttribute('style') ?? '';
    // The responsive values compile to custom properties: one for the base, one from `sm`.
    expect(style).toContain('1');
    expect(style).toContain('3');
  });

  it('defaults to two columns', () => {
    render(<FormGrid data-testid="grid" />);
    expect(screen.getByTestId('grid').getAttribute('style') ?? '').toContain('2');
  });

  it('accepts responsive columns', () => {
    render(<FormGrid data-testid="grid" columns={{ sm: 2, lg: 4 }} />);
    const style = screen.getByTestId('grid').getAttribute('style') ?? '';
    expect(style).toContain('4');
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<FormGrid ref={ref} className="extra" data-testid="grid" />);
    expect(ref.current).toBe(screen.getByTestId('grid'));
    expect(ref.current).toHaveClass('extra');
  });
});

describe('FormGridItem', () => {
  it('renders its children and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FormGridItem ref={ref} data-testid="item">
        <input aria-label="Field" />
      </FormGridItem>,
    );
    expect(ref.current).toBe(screen.getByTestId('item'));
    expect(ref.current).toContainElement(screen.getByLabelText('Field'));
  });

  it('spans the whole row with span="full"', () => {
    render(<FormGridItem data-testid="item" span="full" />);
    expect(screen.getByTestId('item').getAttribute('style') ?? '').toContain('1 / -1');
  });
});
