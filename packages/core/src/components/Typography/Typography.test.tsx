import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Heading, Text, Typography } from './Typography';

describe('Typography', () => {
  it('renders a paragraph with the body variant by default', () => {
    render(<Typography>Hello</Typography>);
    const el = screen.getByText('Hello');
    expect(el.tagName).toBe('P');
    expect(el).toHaveClass('axon-text', 'axon-text--body');
  });

  it.each([
    ['h1', 'H1'],
    ['h3', 'H3'],
    ['h6', 'H6'],
    ['body', 'P'],
    ['bodySm', 'P'],
    ['caption', 'SPAN'],
    ['overline', 'SPAN'],
  ] as const)('maps variant %s to a %s element', (variant, tag) => {
    render(<Typography variant={variant}>Text</Typography>);
    const el = screen.getByText('Text');
    expect(el.tagName).toBe(tag);
    expect(el).toHaveClass(`axon-text--${variant}`);
  });

  it('can render as another element while keeping the style', () => {
    render(
      <Typography variant="h2" as="div">
        Looks like h2
      </Typography>,
    );
    const el = screen.getByText('Looks like h2');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('axon-text--h2');
  });

  it('applies color, weight, align and size modifiers', () => {
    render(
      <Typography color="danger" weight="bold" align="center" size="2xl">
        Styled
      </Typography>,
    );
    expect(screen.getByText('Styled')).toHaveClass(
      'axon-text--color-danger',
      'axon-text--weight-bold',
      'axon-text--align-center',
      'axon-text--size-2xl',
    );
  });

  it('uses the default color without a modifier class', () => {
    render(<Typography>Plain</Typography>);
    expect(screen.getByText('Plain').className).not.toContain('color');
  });

  it.each(['default', 'muted', 'primary', 'secondary', 'success', 'warning', 'neutral'] as const)(
    'accepts color=%s',
    (color) => {
      render(<Typography color={color}>X</Typography>);
      expect(screen.getByText('X')).toBeInTheDocument();
    },
  );

  it('truncates to one line', () => {
    render(<Typography truncate>Long text</Typography>);
    expect(screen.getByText('Long text')).toHaveClass('axon-text--truncate');
  });

  it('clamps to a number of lines through a custom property', () => {
    render(<Typography lineClamp={3}>Long text</Typography>);
    const el = screen.getByText('Long text');
    expect(el).toHaveClass('axon-text--clamp');
    expect(el.getAttribute('style')).toContain('--axon-line-clamp: 3');
  });

  it('forwards the ref and merges className and style', () => {
    const ref = createRef<HTMLParagraphElement>();
    render(
      <Typography ref={ref} className="extra" style={{ margin: 2 }} lineClamp={2}>
        Hi
      </Typography>,
    );
    expect(ref.current).toHaveClass('axon-text', 'extra');
    expect(ref.current).toHaveStyle({ margin: '2px' });
    expect(ref.current?.getAttribute('style')).toContain('--axon-line-clamp: 2');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Typography variant="h1">Title</Typography>
        <Typography>Body</Typography>
        <Typography variant="caption">Caption</Typography>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Heading', () => {
  it('renders an h2 by default', () => {
    render(<Heading>Section</Heading>);
    const heading = screen.getByRole('heading', { name: 'Section', level: 2 });
    expect(heading).toHaveClass('axon-text--h2');
  });

  it.each([1, 2, 3, 4, 5, 6] as const)('level %i renders that heading with its size', (level) => {
    render(<Heading level={level}>Title</Heading>);
    expect(screen.getByRole('heading', { level })).toHaveClass(`axon-text--h${level}`);
  });

  it('lets the visual size differ from the heading level', () => {
    render(
      <Heading level={3} size="sm">
        Small h3
      </Heading>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('axon-text--h3', 'axon-text--size-sm');
  });

  it('forwards the ref and supports shared text props', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Heading ref={ref} color="primary" truncate>
        Title
      </Heading>,
    );
    expect(ref.current).toBe(screen.getByRole('heading'));
    expect(ref.current).toHaveClass('axon-text--color-primary', 'axon-text--truncate');
  });
});

describe('Text', () => {
  it('renders an inline span by default', () => {
    render(<Text>inline</Text>);
    const el = screen.getByText('inline');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('axon-text--body');
  });

  it('supports the text variants and a custom element', () => {
    render(
      <Text variant="overline" as="div">
        LABEL
      </Text>,
    );
    const el = screen.getByText('LABEL');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('axon-text--overline');
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Text ref={ref}>x</Text>);
    expect(ref.current?.tagName).toBe('SPAN');
  });
});
