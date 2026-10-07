import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Grid, GridItem } from './Grid';

const styleOf = (testId: string) => screen.getByTestId(testId).getAttribute('style') ?? '';

describe('Grid', () => {
  it('renders a div with the axon-grid class', () => {
    render(<Grid data-testid="g">x</Grid>);
    expect(screen.getByTestId('g').tagName).toBe('DIV');
    expect(screen.getByTestId('g')).toHaveClass('axon-grid');
    expect(screen.getByTestId('g').getAttribute('style')).toBeNull();
  });

  it('forwards the ref, renders as another element and supports inline', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Grid as="section" ref={ref} inline className="extra">
        x
      </Grid>,
    );
    expect(ref.current?.tagName).toBe('SECTION');
    expect(ref.current).toHaveClass('axon-grid', 'axon-grid--inline', 'extra');
  });

  it('sets the column template and gap', () => {
    render(
      <Grid data-testid="g" columns={3} gap={4}>
        x
      </Grid>,
    );
    expect(styleOf('g')).toContain('--axon-grid-columns: repeat(3, minmax(0, 1fr))');
    expect(styleOf('g')).toContain('--axon-grid-gap: var(--axon-space-4)');
  });

  it('supports responsive columns and gap', () => {
    render(
      <Grid data-testid="g" columns={{ base: 1, md: 2, xl: 4 }} gap={{ base: 2, lg: 6 }}>
        x
      </Grid>,
    );
    const style = styleOf('g');
    expect(style).toContain('--axon-grid-columns: repeat(1, minmax(0, 1fr))');
    expect(style).toContain('--axon-grid-columns-md: repeat(2, minmax(0, 1fr))');
    expect(style).toContain('--axon-grid-columns-xl: repeat(4, minmax(0, 1fr))');
    expect(style).toContain('--axon-grid-gap-lg: var(--axon-space-6)');
  });
});

describe('GridItem', () => {
  it('renders a div with the axon-grid__item class and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <GridItem ref={ref} data-testid="i" className="extra">
        x
      </GridItem>,
    );
    expect(ref.current).toBe(screen.getByTestId('i'));
    expect(ref.current).toHaveClass('axon-grid__item', 'extra');
    expect(ref.current?.getAttribute('style')).toBeNull();
  });

  it('spans columns', () => {
    render(
      <GridItem data-testid="i" span={4}>
        x
      </GridItem>,
    );
    expect(styleOf('i')).toContain('--axon-grid-col: span 4');
  });

  it('spans the full row and can start at a column line', () => {
    const { rerender } = render(
      <GridItem data-testid="i" span="full">
        x
      </GridItem>,
    );
    expect(styleOf('i')).toContain('--axon-grid-col: 1 / -1');
    rerender(
      <GridItem data-testid="i" start={3}>
        x
      </GridItem>,
    );
    expect(styleOf('i')).toContain('--axon-grid-col: 3');
    rerender(
      <GridItem data-testid="i" start={2} span={5}>
        x
      </GridItem>,
    );
    expect(styleOf('i')).toContain('--axon-grid-col: 2 / span 5');
  });

  it('supports responsive spans and merges start per breakpoint', () => {
    render(
      <GridItem data-testid="i" span={{ base: 12, md: 6, lg: 4 }} start={{ lg: 2 }}>
        x
      </GridItem>,
    );
    const style = styleOf('i');
    expect(style).toContain('--axon-grid-col: span 12');
    expect(style).toContain('--axon-grid-col-md: span 6');
    expect(style).toContain('--axon-grid-col-lg: 2 / span 4');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Grid columns={2} gap={2}>
        <GridItem span={1}>one</GridItem>
        <GridItem span={1}>two</GridItem>
      </Grid>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
