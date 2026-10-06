import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a type="button" button with default modifiers', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass(
      'axon-button',
      'axon-button--solid',
      'axon-button--md',
      'axon-button--primary',
    );
  });

  it('applies variant, size and color modifiers', () => {
    render(
      <Button variant="outline" size="lg" color="danger">
        Delete
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass(
      'axon-button--outline',
      'axon-button--lg',
      'axon-button--danger',
    );
  });

  it('supports type="submit"', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('forwards the ref, merges className and spreads props onto the root', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} className="custom" data-testid="b" style={{ margin: 2 }}>
        Go
      </Button>,
    );
    expect(ref.current).toBe(screen.getByTestId('b'));
    expect(ref.current).toHaveClass('axon-button', 'custom');
    expect(ref.current).toHaveStyle({ margin: '2px' });
  });

  it('calls onClick on click and on Enter and Space', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button'));
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('axon-button--disabled');
    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe('loading', () => {
    it('sets aria-busy, shows a spinner, keeps the label and ignores clicks', async () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveClass('axon-button--loading');
      expect(button.querySelector('.axon-button__spinner')).toHaveAttribute('aria-hidden', 'true');
      expect(button).not.toBeDisabled();
      await userEvent.setup().click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('has no spinner or aria-busy when not loading', () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
      expect(document.querySelector('.axon-button__spinner')).toBeNull();
    });
  });

  it('renders decorative start and end icons', () => {
    render(
      <Button startIcon={<svg data-testid="start" />} endIcon={<svg data-testid="end" />}>
        Next
      </Button>,
    );
    expect(screen.getByTestId('start').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('end').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('supports fullWidth', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button')).toHaveClass('axon-button--full-width');
  });

  describe('as a link', () => {
    it('renders an anchor when href is given', () => {
      render(
        <Button href="/docs" target="_blank" rel="noreferrer">
          Docs
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });
      expect(link).toHaveAttribute('href', '/docs');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveClass('axon-button', 'axon-button--solid');
      expect(link).not.toHaveAttribute('type');
    });

    it('forwards the ref to the anchor', () => {
      const ref = createRef<HTMLAnchorElement>();
      render(
        <Button ref={ref} href="/x">
          X
        </Button>,
      );
      expect(ref.current).toBe(screen.getByRole('link'));
    });

    it('removes href, focusability and navigation when disabled', async () => {
      const onClick = vi.fn();
      render(
        <Button href="/docs" disabled onClick={onClick}>
          Docs
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
      await userEvent.setup().click(link);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('sets aria-busy and ignores clicks while loading', async () => {
      const onClick = vi.fn();
      render(
        <Button href="/docs" loading onClick={onClick}>
          Docs
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Docs' });
      expect(link).toHaveAttribute('aria-busy', 'true');
      await userEvent.setup().click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it.each(['solid', 'outline', 'ghost', 'link'] as const)(
      'has no violations (%s)',
      async (variant) => {
        const { container } = render(
          <div>
            <Button variant={variant}>Label</Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} loading>
              Loading
            </Button>
            <Button variant={variant} href="/x">
              Link
            </Button>
          </div>,
        );
        expect(await axe(container)).toHaveNoViolations();
      },
    );
  });
});
