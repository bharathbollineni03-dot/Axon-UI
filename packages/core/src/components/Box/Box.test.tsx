import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Box } from './Box';

describe('Box', () => {
  it('renders a div with the axon-box class by default', () => {
    render(<Box data-testid="b">content</Box>);
    const box = screen.getByTestId('b');
    expect(box.tagName).toBe('DIV');
    expect(box).toHaveClass('axon-box');
    expect(box).toHaveTextContent('content');
  });

  it('renders as another element through `as` and keeps that element props', () => {
    render(
      <Box as="a" href="/docs" data-testid="b">
        link
      </Box>,
    );
    expect(screen.getByTestId('b').tagName).toBe('A');
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute('href', '/docs');
  });

  it('renders as a custom component', () => {
    const Custom = ({ children, ...rest }: { children?: React.ReactNode; 'data-x'?: string }) => (
      <section {...rest}>{children}</section>
    );
    render(
      <Box as={Custom} data-x="1" data-testid="b">
        hi
      </Box>,
    );
    expect(screen.getByTestId('b').tagName).toBe('SECTION');
  });

  it('forwards the ref and merges className and style', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Box ref={ref} className="extra" style={{ color: 'red' }} data-testid="b">
        x
      </Box>,
    );
    expect(ref.current).toBe(screen.getByTestId('b'));
    expect(ref.current).toHaveClass('axon-box', 'extra');
    expect(ref.current).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('turns spacing, surface, radius and shadow props into theme-token styles', () => {
    render(
      <Box data-testid="b" p={4} mx={2} py={1.5} bg="muted" radius="lg" shadow="md" bordered>
        x
      </Box>,
    );
    const style = screen.getByTestId('b').getAttribute('style') ?? '';
    expect(style).toContain('padding: var(--axon-space-4)');
    expect(style).toContain('margin-inline: var(--axon-space-2)');
    expect(style).toContain('padding-block: var(--axon-space-1-5)');
    expect(style).toContain('background-color: var(--axon-color-surface-muted)');
    expect(style).toContain('border-radius: var(--axon-radius-lg)');
    expect(style).toContain('box-shadow: var(--axon-shadow-md)');
    expect(style).toContain('border: 1px solid var(--axon-color-border)');
  });

  it('lets an explicit style override a token prop', () => {
    render(
      <Box data-testid="b" p={4} style={{ padding: '3px' }}>
        x
      </Box>,
    );
    expect(screen.getByTestId('b')).toHaveStyle({ padding: '3px' });
  });

  it('does not set styles when no token props are given', () => {
    render(<Box data-testid="b">x</Box>);
    expect(screen.getByTestId('b').getAttribute('style')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Box p={4}>content</Box>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
