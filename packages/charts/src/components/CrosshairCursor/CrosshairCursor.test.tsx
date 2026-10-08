import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CrosshairCursor } from './CrosshairCursor';

const line = (node: React.ReactNode) => render(<svg>{node}</svg>).container.querySelector('line');

describe('CrosshairCursor', () => {
  it('is a vertical line at an x, by default', () => {
    const el = line(<CrosshairCursor position={40} length={200} />)!;
    expect(el).toHaveAttribute('x1', '40');
    expect(el).toHaveAttribute('x2', '40');
    expect(el).toHaveAttribute('y1', '0');
    expect(el).toHaveAttribute('y2', '200');
    expect(el).toHaveClass('axon-chart__crosshair');
  });

  it('can be a horizontal line at a y', () => {
    const el = line(<CrosshairCursor position={30} length={150} orientation="horizontal" />)!;
    expect(el).toHaveAttribute('y1', '30');
    expect(el).toHaveAttribute('y2', '30');
    expect(el).toHaveAttribute('x2', '150');
  });

  it('draws nothing for a position that is not a number', () => {
    expect(line(<CrosshairCursor position={NaN} length={100} />)).toBeNull();
  });
});
