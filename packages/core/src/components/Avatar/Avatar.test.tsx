import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Avatar, getInitials } from './Avatar';

describe('getInitials', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['ada lovelace', 'AL'],
    ['Madonna', 'M'],
    ['  Jean-Luc   Picard  ', 'JP'],
    ['Grace Brewster Murray Hopper', 'GH'],
    ['Émile Zola', 'ÉZ'],
    ['', ''],
    ['   ', ''],
  ])('turns %j into %j', (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });

  it('keeps characters outside the basic plane whole', () => {
    expect(Array.from(getInitials('😀 smile')).length).toBe(2);
    expect(getInitials('😀 smile')).toBe('😀S');
  });
});

describe('Avatar', () => {
  it('shows initials and is named by `name`', () => {
    render(<Avatar name="Ada Lovelace" />);
    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(avatar).toHaveTextContent('AL');
    expect(avatar).toHaveClass(
      'axon-avatar',
      'axon-avatar--md',
      'axon-avatar--circle',
      'axon-avatar--neutral',
    );
  });

  it('shows the image, with alt text coming from the avatar itself', () => {
    const { container } = render(<Avatar src="/ada.png" name="Ada Lovelace" />);
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeInTheDocument();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/ada.png');
    expect(img).toHaveAttribute('alt', '');
  });

  it('falls back to initials when the image fails to load', () => {
    const { container } = render(<Avatar src="/broken.png" name="Ada Lovelace" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveTextContent('AL');
  });

  it('tries again when src changes after a failure', () => {
    const { container, rerender } = render(<Avatar src="/broken.png" name="Ada" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    rerender(<Avatar src="/good.png" name="Ada" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/good.png');
  });

  it('uses alt as the name when there is no name, and an icon fallback without initials', () => {
    const { container } = render(<Avatar alt="Guest user" />);
    expect(screen.getByRole('img', { name: 'Guest user' })).toBeInTheDocument();
    expect(container.querySelector('.axon-avatar__icon')).toBeInTheDocument();
  });

  it('supports a custom fallback node', () => {
    render(<Avatar alt="Bot" fallback={<span data-testid="bot">🤖</span>} />);
    expect(screen.getByTestId('bot')).toBeInTheDocument();
  });

  it('is hidden from assistive technology when it has no name at all', () => {
    const { container } = render(<Avatar />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps an explicit aria-label', () => {
    render(<Avatar aria-label="Owner" />);
    expect(screen.getByRole('img', { name: 'Owner' })).toBeInTheDocument();
  });

  it('adds a status dot to the accessible name', () => {
    const { container, rerender } = render(<Avatar name="Ada" status="online" />);
    expect(screen.getByRole('img', { name: 'Ada, online' })).toBeInTheDocument();
    expect(container.querySelector('.axon-avatar__status--online')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    rerender(<Avatar name="Ada" status="busy" statusLabel="in a meeting" />);
    expect(screen.getByRole('img', { name: 'Ada, in a meeting' })).toBeInTheDocument();
  });

  it('applies size, shape and color modifiers', () => {
    render(<Avatar name="Ada" size="xl" shape="rounded" color="success" />);
    expect(screen.getByRole('img')).toHaveClass(
      'axon-avatar--xl',
      'axon-avatar--rounded',
      'axon-avatar--success',
    );
  });

  it('forwards the ref, merges className and spreads props', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar ref={ref} name="Ada" className="extra" data-testid="a" />);
    expect(ref.current).toBe(screen.getByTestId('a'));
    expect(ref.current).toHaveClass('axon-avatar', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Avatar name="Ada Lovelace" />
        <Avatar src="/a.png" name="With image" status="online" />
        <Avatar alt="Guest" />
        <Avatar />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
