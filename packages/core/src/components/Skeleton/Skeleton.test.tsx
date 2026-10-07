import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    render(<Skeleton data-testid="s" />);
    expect(screen.getByTestId('s')).toHaveAttribute('aria-hidden', 'true');
  });

  it('defaults to a pulsing text line', () => {
    render(<Skeleton data-testid="s" />);
    expect(screen.getByTestId('s')).toHaveClass(
      'axon-skeleton',
      'axon-skeleton--text',
      'axon-skeleton--pulse',
    );
  });

  it('applies the variant and animation modifiers', () => {
    const { rerender } = render(<Skeleton variant="circle" animation="wave" data-testid="s" />);
    expect(screen.getByTestId('s')).toHaveClass('axon-skeleton--circle', 'axon-skeleton--wave');
    rerender(<Skeleton variant="rect" animation={false} data-testid="s" />);
    const rect = screen.getByTestId('s');
    expect(rect).toHaveClass('axon-skeleton--rect');
    expect(rect).not.toHaveClass('axon-skeleton--pulse', 'axon-skeleton--wave');
  });

  describe('size', () => {
    it('turns numbers into pixels and passes strings through', () => {
      render(<Skeleton variant="rect" width={200} height="50%" data-testid="s" />);
      const style = screen.getByTestId('s').style;
      expect(style.getPropertyValue('--axon-skeleton-width')).toBe('200px');
      expect(style.getPropertyValue('--axon-skeleton-height')).toBe('50%');
    });

    it('makes a circle as tall as it is wide when only one size is given', () => {
      const { rerender } = render(<Skeleton variant="circle" width={48} data-testid="s" />);
      expect(screen.getByTestId('s').style.getPropertyValue('--axon-skeleton-height')).toBe('48px');
      rerender(<Skeleton variant="circle" height={32} data-testid="s" />);
      expect(screen.getByTestId('s').style.getPropertyValue('--axon-skeleton-width')).toBe('32px');
    });

    it('leaves the size to the stylesheet when none is given', () => {
      render(<Skeleton data-testid="s" />);
      const style = screen.getByTestId('s').style;
      expect(style.getPropertyValue('--axon-skeleton-width')).toBe('');
      expect(style.getPropertyValue('--axon-skeleton-height')).toBe('');
    });
  });

  describe('lines', () => {
    it('draws a single element for one line', () => {
      render(<Skeleton data-testid="s" />);
      expect(screen.getByTestId('s').children).toHaveLength(0);
    });

    it('draws several lines, the last one shorter', () => {
      render(<Skeleton lines={3} data-testid="s" />);
      const wrapper = screen.getByTestId('s');
      expect(wrapper).toHaveClass('axon-skeleton-lines');
      expect(wrapper).toHaveAttribute('aria-hidden', 'true');
      expect(wrapper.children).toHaveLength(3);
      expect(wrapper.children[0]).not.toHaveClass('axon-skeleton--last-line');
      expect(wrapper.children[2]).toHaveClass('axon-skeleton--last-line');
    });

    it('ignores lines for other variants', () => {
      render(<Skeleton variant="rect" lines={3} data-testid="s" />);
      expect(screen.getByTestId('s').children).toHaveLength(0);
    });

    it('draws at least one line', () => {
      render(<Skeleton lines={0} data-testid="s" />);
      expect(screen.getByTestId('s')).toHaveClass('axon-skeleton');
    });
  });

  it('forwards the ref, merges className and style, and spreads props', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Skeleton ref={ref} className="extra" style={{ margin: 4 }} data-testid="s" />);
    expect(ref.current).toBe(screen.getByTestId('s'));
    expect(ref.current).toHaveClass('axon-skeleton', 'extra');
    expect(ref.current?.style.margin).toBe('4px');
  });

  it('has no accessibility violations inside a busy region', async () => {
    const { container } = render(
      <div aria-busy="true">
        <Skeleton variant="circle" width={40} />
        <Skeleton lines={3} />
        <Skeleton variant="rect" height={120} animation="wave" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
