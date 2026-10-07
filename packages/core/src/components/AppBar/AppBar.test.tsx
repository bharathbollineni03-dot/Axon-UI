import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { AppBar } from './AppBar';

describe('AppBar', () => {
  it('is a banner landmark', () => {
    render(<AppBar>Axon</AppBar>);
    expect(screen.getByRole('banner')).toHaveTextContent('Axon');
  });

  it('places leading, central and trailing content in order', () => {
    render(
      <AppBar leading={<span>L</span>} trailing={<span>T</span>}>
        <span>C</span>
      </AppBar>,
    );
    expect(screen.getByRole('banner').textContent).toBe('LCT');
  });

  it('omits the empty leading and trailing areas', () => {
    const { container } = render(<AppBar>Only</AppBar>);
    expect(container.querySelector('.axon-app-bar__leading')).toBeNull();
    expect(container.querySelector('.axon-app-bar__trailing')).toBeNull();
  });

  it('defaults to a static, bordered, plain bar', () => {
    render(<AppBar>x</AppBar>);
    expect(screen.getByRole('banner')).toHaveClass(
      'axon-app-bar',
      'axon-app-bar--default',
      'axon-app-bar--static',
      'axon-app-bar--bordered',
    );
  });

  it('supports sticky and fixed positioning', () => {
    const { rerender } = render(<AppBar position="sticky">x</AppBar>);
    expect(screen.getByRole('banner')).toHaveClass('axon-app-bar--sticky');
    rerender(<AppBar position="fixed">x</AppBar>);
    expect(screen.getByRole('banner')).toHaveClass('axon-app-bar--fixed');
  });

  it('fills with a color, without a border by default', () => {
    render(<AppBar color="primary">x</AppBar>);
    const bar = screen.getByRole('banner');
    expect(bar).toHaveClass('axon-app-bar--primary', 'axon-app-bar--colored');
    expect(bar).not.toHaveClass('axon-app-bar--bordered');
  });

  it('lets `bordered` and `elevated` be set explicitly', () => {
    const { rerender } = render(
      <AppBar bordered={false} elevated>
        x
      </AppBar>,
    );
    expect(screen.getByRole('banner')).not.toHaveClass('axon-app-bar--bordered');
    expect(screen.getByRole('banner')).toHaveClass('axon-app-bar--elevated');
    rerender(
      <AppBar color="danger" bordered>
        x
      </AppBar>,
    );
    expect(screen.getByRole('banner')).toHaveClass('axon-app-bar--bordered');
  });

  it('forwards the ref, className, style and extra props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <AppBar ref={ref} className="extra" style={{ margin: 4 }} data-testid="bar">
        x
      </AppBar>,
    );
    expect(ref.current).toBe(screen.getByTestId('bar'));
    expect(ref.current).toHaveClass('extra');
    expect(ref.current).toHaveStyle({ margin: '4px' });
  });

  it('has no axe violations (plain and colored)', async () => {
    const { container } = render(
      <main>
        <AppBar leading={<button type="button">Menu</button>} trailing={<a href="/me">Me</a>}>
          Title
        </AppBar>
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
