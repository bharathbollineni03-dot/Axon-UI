import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Avatar } from '../Avatar';
import { AvatarGroup } from './AvatarGroup';

const people = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Katherine Johnson',
  'Linus Torvalds',
];

describe('AvatarGroup', () => {
  it('renders a labelled group of avatars', () => {
    render(
      <AvatarGroup aria-label="Team">
        {people.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>,
    );
    const group = screen.getByRole('group', { name: 'Team' });
    expect(group).toHaveClass('axon-avatar-group');
    expect(screen.getAllByRole('img')).toHaveLength(5);
  });

  it('collapses the overflow into a +N tile with an accessible name', () => {
    render(
      <AvatarGroup max={3}>
        {people.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(4);
    const overflow = screen.getByRole('img', { name: '2 more' });
    expect(overflow).toHaveTextContent('+2');
    expect(overflow).toHaveClass('axon-avatar--count');
    expect(screen.queryByRole('img', { name: 'Katherine Johnson' })).not.toBeInTheDocument();
  });

  it('shows everything when max is not exceeded', () => {
    render(
      <AvatarGroup max={10}>
        {people.slice(0, 2).map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('supports a custom overflow label', () => {
    render(
      <AvatarGroup max={1} getOverflowLabel={(n) => `y ${n} más`}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'y 2 más' })).toBeInTheDocument();
  });

  it('shares size, shape and color with its avatars; avatars can override', () => {
    render(
      <AvatarGroup size="lg" shape="rounded" color="success" max={2}>
        <Avatar name="Ada" />
        <Avatar name="Grace" size="sm" color="danger" />
        <Avatar name="Alan" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'Ada' })).toHaveClass(
      'axon-avatar--lg',
      'axon-avatar--rounded',
      'axon-avatar--success',
    );
    expect(screen.getByRole('img', { name: 'Grace' })).toHaveClass(
      'axon-avatar--sm',
      'axon-avatar--danger',
    );
    expect(screen.getByRole('img', { name: '1 more' })).toHaveClass(
      'axon-avatar--lg',
      'axon-avatar--rounded',
    );
  });

  it('forwards the ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AvatarGroup ref={ref} className="extra">
        <Avatar name="A" />
      </AvatarGroup>,
    );
    expect(ref.current).toHaveClass('axon-avatar-group', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AvatarGroup max={2} aria-label="Reviewers">
        {people.map((name) => (
          <Avatar key={name} name={name} />
        ))}
      </AvatarGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
