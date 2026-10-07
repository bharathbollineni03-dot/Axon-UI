import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  describe('determinate', () => {
    it('is a progressbar exposing its value and range', () => {
      render(<Progress label="Uploading" value={40} />);
      const bar = screen.getByRole('progressbar', { name: 'Uploading' });
      expect(bar).toHaveAttribute('aria-valuenow', '40');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar).toHaveAttribute('aria-valuetext', '40%');
    });

    it('sizes the linear bar from the value', () => {
      const { container } = render(<Progress label="Uploading" value={40} />);
      expect(container.querySelector<HTMLElement>('.axon-progress__bar')?.style.width).toBe('40%');
    });

    it('respects a custom max', () => {
      render(<Progress label="Steps" value={3} max={4} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemax', '4');
      expect(bar).toHaveAttribute('aria-valuenow', '3');
      expect(bar).toHaveAttribute('aria-valuetext', '75%');
    });

    it('clamps the value into 0..max', () => {
      const { rerender } = render(<Progress label="Uploading" value={150} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
      rerender(<Progress label="Uploading" value={-20} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('treats a max that is not positive as 100', () => {
      render(<Progress label="Uploading" value={50} max={0} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      expect(bar).toHaveAttribute('aria-valuetext', '50%');
    });

    it('treats 0 as determinate, not indeterminate', () => {
      render(<Progress label="Uploading" value={0} data-testid="p" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByTestId('p')).not.toHaveClass('axon-progress--indeterminate');
    });

    it('formats the value text with formatValue', () => {
      render(
        <Progress label="Files" value={3} max={10} formatValue={(v, m) => `${v} of ${m} files`} />,
      );
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '3 of 10 files');
    });
  });

  describe('indeterminate', () => {
    it.each([undefined, null])('has no value when value is %s', (value) => {
      render(<Progress label="Loading" value={value} data-testid="p" />);
      const bar = screen.getByRole('progressbar');
      expect(bar).not.toHaveAttribute('aria-valuenow');
      expect(bar).not.toHaveAttribute('aria-valuetext');
      expect(screen.getByTestId('p')).toHaveClass('axon-progress--indeterminate');
    });

    it('does not show a value even with showValue', () => {
      render(<Progress label="Loading" showValue />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe('accessible name', () => {
    it('is named by its visible label', () => {
      render(<Progress label="Storage used" value={10} />);
      expect(screen.getByRole('progressbar', { name: 'Storage used' })).toBeInTheDocument();
      expect(screen.getByText('Storage used')).toBeVisible();
    });

    it('accepts aria-label', () => {
      render(<Progress aria-label="Page load" value={10} />);
      expect(screen.getByRole('progressbar', { name: 'Page load' })).toBeInTheDocument();
    });

    it('accepts aria-labelledby', () => {
      render(
        <div>
          <h2 id="heading">Import</h2>
          <Progress aria-labelledby="heading" value={10} />
        </div>,
      );
      expect(screen.getByRole('progressbar', { name: 'Import' })).toBeInTheDocument();
    });
  });

  describe('showValue', () => {
    it('shows the percentage beside the label, hidden from screen readers', () => {
      render(<Progress label="Uploading" value={40} showValue />);
      const text = screen.getByText('40%');
      expect(text).toBeVisible();
      expect(text).toHaveAttribute('aria-hidden', 'true');
    });

    it('is off by default', () => {
      render(<Progress label="Uploading" value={40} />);
      expect(screen.queryByText('40%')).not.toBeInTheDocument();
    });
  });

  describe('circular', () => {
    it('is a progressbar with the same semantics', () => {
      render(<Progress variant="circular" label="Sync" value={25} data-testid="p" />);
      const bar = screen.getByRole('progressbar', { name: 'Sync' });
      expect(bar).toHaveAttribute('aria-valuenow', '25');
      expect(bar).toHaveAttribute('aria-valuetext', '25%');
      expect(screen.getByTestId('p')).toHaveClass('axon-progress--circular');
    });

    it('draws the ring from the value', () => {
      const { container } = render(<Progress variant="circular" label="Sync" value={25} />);
      const ring = container.querySelector('circle.axon-progress__bar');
      expect(ring).toHaveAttribute('stroke-dashoffset', '75');
    });

    it('shows the value inside the ring', () => {
      render(<Progress variant="circular" label="Sync" value={25} showValue />);
      expect(screen.getByRole('progressbar')).toContainElement(screen.getByText('25%'));
    });

    it('animates when indeterminate', () => {
      const { container } = render(<Progress variant="circular" label="Sync" data-testid="p" />);
      expect(screen.getByTestId('p')).toHaveClass('axon-progress--indeterminate');
      expect(container.querySelector('circle.axon-progress__bar')).not.toHaveAttribute(
        'stroke-dashoffset',
      );
    });
  });

  it('applies size and color modifiers, defaulting to a medium primary bar', () => {
    const { rerender } = render(<Progress label="x" value={1} data-testid="p" />);
    expect(screen.getByTestId('p')).toHaveClass(
      'axon-progress--linear',
      'axon-progress--md',
      'axon-progress--primary',
    );
    rerender(<Progress label="x" value={1} size="lg" color="success" data-testid="p" />);
    expect(screen.getByTestId('p')).toHaveClass('axon-progress--lg', 'axon-progress--success');
  });

  it('forwards the ref, merges className and spreads props onto the root', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} label="x" value={1} className="extra" data-testid="p" />);
    expect(ref.current).toBe(screen.getByTestId('p'));
    expect(ref.current).toHaveClass('axon-progress', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Progress label="Determinate" value={40} showValue />
        <Progress label="Indeterminate" />
        <Progress aria-label="Unnamed visually" value={80} color="success" />
        <Progress variant="circular" label="Circular" value={60} showValue />
        <Progress variant="circular" aria-label="Spinning" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
