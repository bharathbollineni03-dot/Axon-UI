import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

const icon = <svg data-testid="icon" />;

describe('IconButton', () => {
  it('is named by aria-label and renders the icon', () => {
    render(<IconButton aria-label="Settings">{icon}</IconButton>);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('requires an aria-label at compile time', () => {
    // @ts-expect-error aria-label is required
    render(<IconButton>{icon}</IconButton>);
  });

  it('defaults to a round, ghost, neutral button', () => {
    render(<IconButton aria-label="Close">{icon}</IconButton>);
    expect(screen.getByRole('button')).toHaveClass(
      'axon-button',
      'axon-button--icon-only',
      'axon-button--round',
      'axon-button--ghost',
      'axon-button--neutral',
    );
  });

  it('supports square shape, variant, size and color', () => {
    render(
      <IconButton aria-label="Add" shape="square" variant="solid" size="lg" color="success">
        {icon}
      </IconButton>,
    );
    expect(screen.getByRole('button')).toHaveClass(
      'axon-button--square',
      'axon-button--solid',
      'axon-button--lg',
      'axon-button--success',
    );
  });

  it('forwards the ref, merges className and handles clicks', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <IconButton ref={ref} aria-label="Go" className="extra" onClick={onClick}>
        {icon}
      </IconButton>,
    );
    expect(ref.current).toHaveClass('extra');
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports disabled and loading', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <IconButton aria-label="Go" disabled onClick={onClick}>
        {icon}
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(
      <IconButton aria-label="Go" loading onClick={onClick}>
        {icon}
      </IconButton>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as a link when href is given', () => {
    render(
      <IconButton aria-label="Home" href="/">
        {icon}
      </IconButton>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <IconButton aria-label="One">{icon}</IconButton>
        <IconButton aria-label="Two" disabled>
          {icon}
        </IconButton>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
