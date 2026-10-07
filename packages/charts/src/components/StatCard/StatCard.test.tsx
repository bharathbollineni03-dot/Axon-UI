import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { StatCard, type StatCardProps } from './StatCard';

function renderCard(props: Partial<StatCardProps> = {}) {
  return render(<StatCard title="Revenue" value={128430} valueFormat="$,.0f" {...props} />);
}

const card = () => screen.getByRole('group', { name: 'Revenue' });
const delta = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.axon-stat-card__delta');

describe('StatCard', () => {
  it('is a group named by its title, with the figure', () => {
    renderCard();
    expect(card()).toHaveTextContent('$128,430');
  });

  it('formats a number, and shows anything else as it is', () => {
    const { rerender } = renderCard({ value: 1234.5, valueFormat: undefined });
    expect(card()).toHaveTextContent('1,234.5');
    rerender(<StatCard title="Revenue" value="n/a" />);
    expect(card()).toHaveTextContent('n/a');
    rerender(<StatCard title="Revenue" value={<strong>Soon</strong>} />);
    expect(screen.getByText('Soon').tagName).toBe('STRONG');
  });

  describe('the change', () => {
    it('shows an increase as good news, in words, an arrow and a colour', () => {
      const { container } = renderCard({ delta: 0.124, deltaLabel: 'vs last month' });
      expect(delta(container)).toHaveAttribute('data-tone', 'good');
      expect(delta(container)).toHaveAttribute('data-direction', 'up');
      expect(delta(container)).toHaveTextContent('Up +12.4%');
      expect(container.querySelector('.axon-stat-card__arrow')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(card()).toHaveTextContent('Up +12.4%vs last month');
    });

    it('shows a decrease as bad news', () => {
      const { container } = renderCard({ delta: -0.05 });
      expect(delta(container)).toHaveAttribute('data-tone', 'bad');
      expect(delta(container)).toHaveAttribute('data-direction', 'down');
      expect(delta(container)).toHaveTextContent('Down −5.0%');
    });

    it('can treat an increase as bad, for costs and errors', () => {
      const { container, rerender } = renderCard({ delta: 0.2, positiveIsGood: false });
      expect(delta(container)).toHaveAttribute('data-tone', 'bad');
      expect(delta(container)).toHaveAttribute('data-direction', 'up');
      rerender(<StatCard title="Revenue" value={1} delta={-0.2} positiveIsGood={false} />);
      expect(delta(container)).toHaveAttribute('data-tone', 'good');
    });

    it('is neutral when nothing changed', () => {
      const { container } = renderCard({ delta: 0 });
      expect(delta(container)).toHaveAttribute('data-tone', 'neutral');
      expect(delta(container)).toHaveAttribute('data-direction', 'flat');
      expect(delta(container)).toHaveTextContent('No change');
    });

    it('can be formatted for an absolute change', () => {
      renderCard({ delta: 340, deltaFormat: '+,.0f' });
      expect(card()).toHaveTextContent('Up +340');
    });

    it('is left out without a number', () => {
      const { container } = renderCard({ delta: undefined, deltaLabel: undefined });
      expect(delta(container)).toBeNull();
      renderCard({ delta: NaN });
      expect(document.querySelectorAll('.axon-stat-card__delta')).toHaveLength(0);
    });

    it('can be translated', () => {
      const { container } = renderCard({ delta: 0.1, labels: { increase: 'Sube' } });
      expect(delta(container)).toHaveTextContent('Sube +10.0%');
    });
  });

  describe('the trend', () => {
    it('draws a tiny sparkline, hidden from screen readers, coloured by the news', () => {
      const { container } = renderCard({ delta: 0.1, sparkline: [1, 3, 2, 5] });
      const svg = container.querySelector('svg.axon-sparkline')!;
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect((svg.querySelector('.axon-sparkline__line') as SVGElement).style.stroke).toBe(
        'var(--axon-color-success-solid)',
      );
    });

    it('is red for bad news, and the first palette colour when neutral', () => {
      const { container, rerender } = renderCard({ delta: -0.1, sparkline: [3, 2, 1] });
      expect((container.querySelector('.axon-sparkline__line') as SVGElement).style.stroke).toBe(
        'var(--axon-color-danger-solid)',
      );
      rerender(<StatCard title="Revenue" value={1} sparkline={[3, 2, 1]} />);
      expect((container.querySelector('.axon-sparkline__line') as SVGElement).style.stroke).toBe(
        'var(--axon-chart-1)',
      );
    });

    it('can be bars, and is left out when there are no values', () => {
      const { container, rerender } = renderCard({ sparkline: [1, 2], sparklineType: 'bar' });
      expect(container.querySelectorAll('rect.axon-sparkline__bar')).toHaveLength(2);
      rerender(<StatCard title="Revenue" value={1} sparkline={[]} />);
      expect(container.querySelector('svg.axon-sparkline')).toBeNull();
    });
  });

  it('shows a description and an icon the screen reader skips', () => {
    const { container } = renderCard({
      description: 'Includes refunds',
      icon: <svg data-testid="icon" />,
    });
    expect(screen.getByText('Includes refunds')).toBeInTheDocument();
    expect(container.querySelector('.axon-stat-card__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows placeholders while loading, not the figure', () => {
    const { container } = renderCard({ loading: true, delta: 0.1 });
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(card()).not.toHaveTextContent('$128,430');
    expect(card()).toHaveAttribute('aria-busy', 'true');
    expect(delta(container)).toBeNull();
  });

  it('takes a class name, style and card variant', () => {
    const { container } = renderCard({
      className: 'mine',
      variant: 'elevated',
      style: { width: 240 },
    });
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('axon-stat-card', 'mine', 'axon-card--elevated');
    expect(root).toHaveStyle({ width: '240px' });
  });

  it('has no accessibility violations', async () => {
    const { container, rerender } = renderCard({
      delta: 0.124,
      deltaLabel: 'vs last month',
      sparkline: [1, 2, 3],
      description: 'Includes refunds',
    });
    expect(await axe(container)).toHaveNoViolations();
    rerender(<StatCard title="Revenue" value={1} loading />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
