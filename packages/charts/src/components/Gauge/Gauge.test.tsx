import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { bandFor, Gauge, type GaugeProps, type GaugeThreshold } from './Gauge';

const thresholds: GaugeThreshold[] = [
  { to: 60, color: 'green', label: 'Healthy' },
  { to: 85, color: 'orange', label: 'Busy' },
  { to: 100, color: 'red', label: 'Overloaded' },
];

function renderGauge(props: Partial<GaugeProps> = {}) {
  return render(<Gauge value={72} label="CPU load" valueFormat=".0f" {...props} />);
}

const meter = () => screen.getByRole('meter');
const valueArc = (container: HTMLElement) =>
  container.querySelector<SVGPathElement>('path.axon-gauge__value');

describe('bandFor', () => {
  it('finds the first band a value does not pass', () => {
    expect(bandFor(10, thresholds)?.label).toBe('Healthy');
    expect(bandFor(60, thresholds)?.label).toBe('Healthy');
    expect(bandFor(60.1, thresholds)?.label).toBe('Busy');
    expect(bandFor(100, thresholds)?.label).toBe('Overloaded');
  });

  it('uses the last band for a value beyond all of them', () => {
    expect(bandFor(500, thresholds)?.label).toBe('Overloaded');
  });

  it('has no band without thresholds', () => {
    expect(bandFor(5, [])).toBeUndefined();
  });
});

describe('Gauge', () => {
  it('is a meter with its value and range, named by its label', () => {
    renderGauge();
    expect(meter()).toHaveAccessibleName('CPU load');
    expect(meter()).toHaveAttribute('aria-valuenow', '72');
    expect(meter()).toHaveAttribute('aria-valuemin', '0');
    expect(meter()).toHaveAttribute('aria-valuemax', '100');
    expect(meter()).toHaveAttribute('aria-valuetext', '72 of 100');
  });

  it('says which band the value is in', () => {
    renderGauge({ thresholds });
    expect(meter()).toHaveAttribute('aria-valuetext', '72 of 100, Busy');
  });

  it('is named by the title when there is no text label, or by your own label', () => {
    const { rerender } = render(<Gauge value={5} title="Disk" />);
    expect(meter()).toHaveAccessibleName('Disk');
    rerender(<Gauge value={5} title="Disk" ariaLabel="Disk usage" />);
    expect(meter()).toHaveAccessibleName('Disk usage');
    rerender(<Gauge value={5} />);
    expect(meter()).toHaveAccessibleName('Gauge');
  });

  it('shows the value, formatted, with the label under it', () => {
    renderGauge({ value: 0.456, valueFormat: '.1%', min: 0, max: 1 });
    expect(screen.getByText('45.6%')).toBeInTheDocument();
    expect(screen.getByText('CPU load')).toBeInTheDocument();
  });

  it('shows the lowest and highest values at the ends, unless turned off', () => {
    const { container, rerender } = renderGauge({ min: 10, max: 50, value: 20 });
    const limits = () =>
      [...container.querySelectorAll('.axon-chart__tick-label')].map((el) => el.textContent);
    expect(limits()).toEqual(['10', '50']);
    rerender(<Gauge value={20} min={10} max={50} showLimits={false} />);
    expect(limits()).toEqual([]);
  });

  describe('the arc', () => {
    it('draws the arc up to the value, in the colour of its band', () => {
      const { container } = renderGauge({ thresholds });
      expect(valueArc(container)).not.toBeNull();
      expect((valueArc(container) as unknown as SVGElement).style.fill).toBe('orange');
      expect(container.querySelectorAll('path.axon-gauge__band')).toHaveLength(3);
      expect(container.querySelector('.axon-gauge__marker')).not.toBeNull();
    });

    it('changes colour with the band', () => {
      const { container, rerender } = renderGauge({ thresholds, value: 20 });
      expect((valueArc(container) as unknown as SVGElement).style.fill).toBe('green');
      rerender(<Gauge value={95} thresholds={thresholds} />);
      expect((valueArc(container) as unknown as SVGElement).style.fill).toBe('red');
    });

    it('uses one colour and a plain track without thresholds', () => {
      const { container } = renderGauge({ color: 'teal' });
      expect(container.querySelector('path.axon-gauge__track')).not.toBeNull();
      expect(container.querySelectorAll('path.axon-gauge__band')).toHaveLength(0);
      expect((valueArc(container) as unknown as SVGElement).style.fill).toBe('teal');
      expect(container.querySelector('.axon-gauge__marker')).toBeNull();
    });

    it('uses the first palette colour by default', () => {
      const { container } = renderGauge();
      expect((valueArc(container) as unknown as SVGElement).style.fill).toBe('var(--axon-chart-1)');
    });

    it('draws no arc at the minimum, and a longer arc for a bigger value', () => {
      const { container, rerender } = renderGauge({ value: 0 });
      expect(valueArc(container)).toBeNull();
      rerender(<Gauge value={25} />);
      const short = valueArc(container)!.getAttribute('d')!;
      rerender(<Gauge value={90} />);
      expect(valueArc(container)!.getAttribute('d')).not.toBe(short);
    });

    it('holds a value outside the range to its ends', () => {
      const { container, rerender } = renderGauge({ value: 150 });
      const over = valueArc(container)!.getAttribute('d');
      rerender(<Gauge value={100} />);
      expect(valueArc(container)!.getAttribute('d')).toBe(over);
      rerender(<Gauge value={-20} />);
      expect(valueArc(container)).toBeNull();
    });

    it('can cover more of a circle, and has a sensible limit either way', () => {
      const half = renderGauge({ angle: 180 }).container.querySelector('svg')!;
      const wide = render(<Gauge value={50} angle={270} />).container.querySelector('svg')!;
      expect(Number(wide.getAttribute('height'))).toBeGreaterThan(
        Number(half.getAttribute('height')),
      );
      const tooWide = render(<Gauge value={50} angle={999} />).container.querySelector('svg')!;
      const limit = render(<Gauge value={50} angle={300} />).container.querySelector('svg')!;
      expect(tooWide.getAttribute('height')).toBe(limit.getAttribute('height'));
    });

    it('has the width asked for', () => {
      expect(renderGauge({ width: 300 }).container.querySelector('svg')).toHaveAttribute(
        'width',
        '300',
      );
    });
  });

  describe('states', () => {
    it('shows a message when there is no reading, or your own', () => {
      const { rerender } = render(<Gauge value={null} label="CPU" />);
      expect(screen.getByText('No data to display')).toBeInTheDocument();
      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
      rerender(<Gauge value={null} emptyState="Offline" />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows a placeholder while loading', () => {
      const { container } = renderGauge({ loading: true });
      expect(screen.getByRole('status')).toHaveTextContent('Loading chart');
      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
      expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true');
    });

    it('animates unless told not to', () => {
      const { container, rerender } = renderGauge();
      expect(container.querySelector('figure')).toHaveClass('axon-chart--animate');
      rerender(<Gauge value={72} animate={false} />);
      expect(container.querySelector('figure')).not.toHaveClass('axon-chart--animate');
    });
  });

  it('has a title that names the figure', () => {
    renderGauge({ title: 'Server load' });
    expect(screen.getByRole('figure')).toHaveAccessibleName('Server load');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGauge({ thresholds, title: 'Server load' });
    expect(await axe(container)).toHaveNoViolations();
    const { container: wide } = render(<Gauge value={30} angle={270} label="Score" />);
    expect(await axe(wide)).toHaveNoViolations();
  });
});
