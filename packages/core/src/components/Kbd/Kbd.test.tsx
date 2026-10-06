import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders a kbd element with its key', () => {
    render(<Kbd>Esc</Kbd>);
    const key = screen.getByText('Esc');
    expect(key.tagName).toBe('KBD');
    expect(key).toHaveClass('axon-kbd');
  });

  it('renders a combination as nested kbd elements joined by plus signs', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'Shift', 'K']} data-testid="k" />);
    const group = screen.getByTestId('k');
    expect(group.tagName).toBe('KBD');
    expect(group).toHaveClass('axon-kbd-group');
    expect([...container.querySelectorAll('kbd.axon-kbd')].map((k) => k.textContent)).toEqual([
      'Ctrl',
      'Shift',
      'K',
    ]);
    expect(container.querySelectorAll('.axon-kbd-group__plus')).toHaveLength(2);
  });

  it('uses a single key when keys has one entry', () => {
    const { container } = render(<Kbd keys={['Enter']} />);
    expect(container.querySelectorAll('.axon-kbd-group__plus')).toHaveLength(0);
    expect(container.querySelectorAll('kbd.axon-kbd')).toHaveLength(1);
  });

  it('falls back to children when keys is empty', () => {
    render(<Kbd keys={[]}>Tab</Kbd>);
    expect(screen.getByText('Tab')).toHaveClass('axon-kbd');
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Kbd ref={ref} className="extra">
        A
      </Kbd>,
    );
    expect(ref.current).toHaveClass('axon-kbd', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <p>
        Press <Kbd>Esc</Kbd> or <Kbd keys={['Ctrl', 'K']} /> to continue.
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
