import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Container } from './Container';

describe('Container', () => {
  it('renders a div with a large max width by default', () => {
    render(<Container data-testid="c">x</Container>);
    expect(screen.getByTestId('c')).toHaveClass('axon-container', 'axon-container--lg');
  });

  it.each(['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const)('applies maxWidth=%s', (size) => {
    render(
      <Container data-testid="c" maxWidth={size}>
        x
      </Container>,
    );
    expect(screen.getByTestId('c')).toHaveClass(`axon-container--${size}`);
  });

  it('sets the gutter from the spacing scale (default 4)', () => {
    const { rerender } = render(<Container data-testid="c">x</Container>);
    expect(screen.getByTestId('c').getAttribute('style')).toContain(
      'padding-inline: var(--axon-space-4)',
    );
    rerender(
      <Container data-testid="c" gutter={8}>
        x
      </Container>,
    );
    expect(screen.getByTestId('c').getAttribute('style')).toContain(
      'padding-inline: var(--axon-space-8)',
    );
  });

  it('can opt out of centering', () => {
    render(
      <Container data-testid="c" disableCenter>
        x
      </Container>,
    );
    expect(screen.getByTestId('c')).toHaveClass('axon-container--start');
  });

  it('renders as another element, forwards the ref and merges className/style', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Container as="main" ref={ref} className="extra" style={{ margin: 3 }}>
        x
      </Container>,
    );
    expect(ref.current?.tagName).toBe('MAIN');
    expect(ref.current).toHaveClass('axon-container', 'extra');
    expect(ref.current).toHaveStyle({ margin: '3px' });
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Container>content</Container>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
