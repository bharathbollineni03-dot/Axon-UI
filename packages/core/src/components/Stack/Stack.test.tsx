import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Divider } from '../Divider';
import { Stack } from './Stack';

const styleOf = (testId = 's') => screen.getByTestId(testId).getAttribute('style') ?? '';

describe('Stack', () => {
  it('renders a div with the axon-stack class and its children', () => {
    render(
      <Stack data-testid="s">
        <span>one</span>
        <span>two</span>
      </Stack>,
    );
    expect(screen.getByTestId('s').tagName).toBe('DIV');
    expect(screen.getByTestId('s')).toHaveClass('axon-stack');
    expect(screen.getByText('two')).toBeInTheDocument();
  });

  it('renders as another element and forwards the ref', () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <Stack as="ul" ref={ref} className="extra">
        <li>a</li>
      </Stack>,
    );
    expect(ref.current?.tagName).toBe('UL');
    expect(ref.current).toHaveClass('axon-stack', 'extra');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('sets layout variables from plain values', () => {
    render(
      <Stack data-testid="s" direction="row" gap={4} align="center" justify="between" wrap>
        x
      </Stack>,
    );
    const style = styleOf();
    expect(style).toContain('--axon-stack-direction: row');
    expect(style).toContain('--axon-stack-gap: var(--axon-space-4)');
    expect(style).toContain('--axon-stack-align: center');
    expect(style).toContain('--axon-stack-justify: space-between');
    expect(style).toContain('--axon-stack-wrap: wrap');
  });

  it('sets one variable per breakpoint for responsive values', () => {
    render(
      <Stack data-testid="s" direction={{ base: 'column', md: 'row' }} gap={{ base: 2, lg: 6 }}>
        x
      </Stack>,
    );
    const style = styleOf();
    expect(style).toContain('--axon-stack-direction: column');
    expect(style).toContain('--axon-stack-direction-md: row');
    expect(style).toContain('--axon-stack-gap: var(--axon-space-2)');
    expect(style).toContain('--axon-stack-gap-lg: var(--axon-space-6)');
    expect(style).not.toContain('--axon-stack-gap-md');
  });

  it('maps wrap=false to nowrap and supports inline', () => {
    render(
      <Stack data-testid="s" wrap={false} inline>
        x
      </Stack>,
    );
    expect(styleOf()).toContain('--axon-stack-wrap: nowrap');
    expect(screen.getByTestId('s')).toHaveClass('axon-stack--inline');
  });

  it('inserts the divider between children only', () => {
    render(
      <Stack divider={<Divider decorative data-testid="d" />}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Stack>,
    );
    expect(screen.getAllByTestId('d')).toHaveLength(2);
  });

  it('adds no divider for a single child or none', () => {
    const { rerender } = render(
      <Stack divider={<Divider decorative data-testid="d" />}>
        <span>only</span>
      </Stack>,
    );
    expect(screen.queryByTestId('d')).not.toBeInTheDocument();
    rerender(<Stack divider={<Divider decorative data-testid="d" />} />);
    expect(screen.queryByTestId('d')).not.toBeInTheDocument();
  });

  it('merges an explicit style over the variables', () => {
    render(
      <Stack data-testid="s" gap={2} style={{ margin: 2 }}>
        x
      </Stack>,
    );
    expect(screen.getByTestId('s')).toHaveStyle({ margin: '2px' });
    expect(styleOf()).toContain('--axon-stack-gap');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Stack divider={<Divider />}>
        <p>one</p>
        <p>two</p>
      </Stack>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
