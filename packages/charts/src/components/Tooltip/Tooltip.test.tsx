import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip, TooltipContent } from './Tooltip';

const place = (props: { x: number; y: number }) =>
  render(
    <Tooltip {...props} containerWidth={600} containerHeight={300}>
      <span>Hello</span>
    </Tooltip>,
  ).container.firstElementChild as HTMLElement;

describe('Tooltip', () => {
  it('sits beside the point, with a gap', () => {
    expect(place({ x: 100, y: 50 }).style.transform).toBe('translate(112px, 62px)');
  });

  it('moves to the other side of the point near the right edge', () => {
    expect(place({ x: 595, y: 50 }).style.transform).toBe('translate(583px, 62px)');
  });

  it('moves above the point near the bottom edge', () => {
    expect(place({ x: 100, y: 295 }).style.transform).toBe('translate(112px, 283px)');
  });

  it('never goes off the top or left', () => {
    expect(place({ x: 4, y: 4 }).style.transform).not.toMatch(/-\d/);
    const element = render(
      <Tooltip x={600} y={0} containerWidth={600} containerHeight={300} offset={20}>
        x
      </Tooltip>,
    ).container.firstElementChild as HTMLElement;
    expect(element.style.transform).not.toMatch(/-\d/);
  });

  it('is hidden from assistive technology', () => {
    const element = place({ x: 1, y: 1 });
    expect(element).toHaveAttribute('aria-hidden', 'true');
    expect(element).toHaveClass('axon-chart-tooltip');
  });

  it('shows what it is given, with an id', () => {
    const { container } = render(
      <Tooltip x={0} y={0} containerWidth={100} containerHeight={100} id="tip">
        <span>Hello</span>
      </Tooltip>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(container.querySelector('#tip')).not.toBeNull();
  });
});

describe('TooltipContent', () => {
  it('has a heading and a row for each series', () => {
    const { container } = render(
      <TooltipContent
        title="March"
        rows={[
          { key: 'a', name: 'Revenue', value: '1,200', color: 'red' },
          { key: 'b', name: 'Costs', value: '800' },
        ]}
      />,
    );
    expect(screen.getByText('March')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Revenue').nextSibling).toHaveTextContent('1,200');
    expect(container.querySelectorAll('.axon-chart-tooltip__swatch')).toHaveLength(1);
  });

  it('can be without a heading', () => {
    const { container } = render(<TooltipContent rows={[]} />);
    expect(container.querySelector('.axon-chart-tooltip__title')).toBeNull();
  });
});
