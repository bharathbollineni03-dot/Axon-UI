import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Card, CardContent, CardFooter, CardHeader, CardMedia } from './Card';

describe('Card', () => {
  it('renders an outlined div by default', () => {
    render(<Card data-testid="c">content</Card>);
    const card = screen.getByTestId('c');
    expect(card.tagName).toBe('DIV');
    expect(card).toHaveClass('axon-card', 'axon-card--outlined');
    expect(card).not.toHaveAttribute('role');
    expect(card).not.toHaveAttribute('tabindex');
  });

  it('supports variants and elevation (only for elevated)', () => {
    const { rerender } = render(
      <Card data-testid="c" variant="elevated" elevation={3}>
        x
      </Card>,
    );
    expect(screen.getByTestId('c')).toHaveClass('axon-card--elevated', 'axon-card--elevation-3');
    rerender(
      <Card data-testid="c" variant="elevated">
        x
      </Card>,
    );
    expect(screen.getByTestId('c')).toHaveClass('axon-card--elevation-1');
    rerender(
      <Card data-testid="c" variant="filled" elevation={3}>
        x
      </Card>,
    );
    expect(screen.getByTestId('c')).toHaveClass('axon-card--filled');
    expect(screen.getByTestId('c').className).not.toContain('elevation');
  });

  it('forwards the ref, merges className and renders as another element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Card as="article" ref={ref} className="extra">
        x
      </Card>,
    );
    expect(ref.current?.tagName).toBe('ARTICLE');
    expect(ref.current).toHaveClass('axon-card', 'extra');
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  describe('clickable', () => {
    it('becomes a keyboard-operable button when it has an onClick', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card clickable onClick={onClick}>
          Open project
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'Open project' });
      expect(card).toHaveClass('axon-card--clickable');
      expect(card).toHaveAttribute('tabindex', '0');
      await user.click(card);
      card.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('renders as a link when given href', () => {
      render(
        <Card clickable href="/project">
          Project
        </Card>,
      );
      const link = screen.getByRole('link', { name: 'Project' });
      expect(link).toHaveAttribute('href', '/project');
      expect(link).not.toHaveAttribute('role');
    });

    it('does not add button semantics when it is not clickable or already interactive', () => {
      const { rerender } = render(<Card onClick={() => {}}>x</Card>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      rerender(
        <Card as="button" clickable onClick={() => {}}>
          x
        </Card>,
      );
      expect(screen.getByRole('button')).not.toHaveAttribute('tabindex');
    });

    it('ignores clicks and keys when disabled', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card clickable disabled onClick={onClick}>
          Nope
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'Nope' });
      expect(card).toHaveAttribute('aria-disabled', 'true');
      expect(card).not.toHaveAttribute('tabindex');
      await user.click(card);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('removes the href of a disabled link card', () => {
      render(
        <Card clickable disabled href="/x" data-testid="c">
          x
        </Card>,
      );
      expect(screen.getByTestId('c')).not.toHaveAttribute('href');
    });

    it('does not trigger when a key is pressed inside an inner control', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Card clickable onClick={onClick}>
          <input aria-label="inner" />
        </Card>,
      );
      await user.click(screen.getByLabelText('inner'));
      onClick.mockClear();
      await user.keyboard('{Enter} ');
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Card variant="elevated" as="article">
        <CardHeader title="Title" titleAs="h3" subtitle="Sub" />
        <CardMedia src="/x.png" alt="" aspectRatio="16 / 9" />
        <CardContent>Body</CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CardHeader', () => {
  it('shows title, subtitle, avatar and action', () => {
    render(
      <CardHeader
        title="Project"
        subtitle="Updated today"
        avatar={<span data-testid="av" />}
        action={<button>Menu</button>}
      />,
    );
    expect(screen.getByText('Project')).toHaveClass('axon-card__title');
    expect(screen.getByText('Updated today')).toHaveClass('axon-card__subtitle');
    expect(screen.getByTestId('av')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('renders the title as a heading with titleAs', () => {
    render(<CardHeader title="Heading" titleAs="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Heading' })).toBeInTheDocument();
  });

  it('omits empty slots and forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<CardHeader ref={ref} title="Only title" />);
    expect(ref.current).toHaveClass('axon-card__header');
    expect(container.querySelector('.axon-card__subtitle')).toBeNull();
    expect(container.querySelector('.axon-card__avatar')).toBeNull();
    expect(container.querySelector('.axon-card__action')).toBeNull();
  });
});

describe('CardMedia', () => {
  it('renders a lazy image with alt text and an aspect ratio', () => {
    const { container } = render(
      <CardMedia src="/pic.png" alt="A mountain" aspectRatio="16 / 9" />,
    );
    const img = screen.getByRole('img', { name: 'A mountain' });
    expect(img).toHaveAttribute('src', '/pic.png');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(container.firstElementChild).toHaveStyle({ aspectRatio: '16 / 9' });
  });

  it('treats a missing alt as decorative', () => {
    const { container } = render(<CardMedia src="/pic.png" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('renders custom media instead of an image', () => {
    render(
      <CardMedia>
        <canvas data-testid="v" />
      </CardMedia>,
    );
    expect(screen.getByTestId('v')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('CardContent and CardFooter', () => {
  it('renders sections with their classes and forwards refs', () => {
    const contentRef = createRef<HTMLDivElement>();
    const footerRef = createRef<HTMLDivElement>();
    render(
      <>
        <CardContent ref={contentRef} className="c">
          body
        </CardContent>
        <CardFooter ref={footerRef} align="between">
          foot
        </CardFooter>
      </>,
    );
    expect(contentRef.current).toHaveClass('axon-card__content', 'c');
    expect(footerRef.current).toHaveClass('axon-card__footer', 'axon-card__footer--between');
  });

  it('aligns footer actions to the end by default', () => {
    render(<CardFooter data-testid="f">x</CardFooter>);
    expect(screen.getByTestId('f')).toHaveClass('axon-card__footer--end');
  });
});
