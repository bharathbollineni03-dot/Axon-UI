import { createRef, forwardRef, type AnchorHTMLAttributes } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Link } from './Link';

describe('Link', () => {
  it('renders an anchor with the href and the default modifiers', () => {
    render(<Link href="/docs">Docs</Link>);
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveClass('axon-link', 'axon-link--primary', 'axon-link--underline-hover');
  });

  it('applies color and underline modifiers, className and style', () => {
    render(
      <Link href="#" color="danger" underline="always" className="extra" style={{ margin: 2 }}>
        x
      </Link>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveClass('axon-link--danger', 'axon-link--underline-always', 'extra');
    expect(link).toHaveStyle({ margin: '2px' });
  });

  it('forwards the ref and extra props to the element', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link ref={ref} href="#" data-testid="l" aria-label="Home page">
        Home
      </Link>,
    );
    expect(ref.current).toBe(screen.getByTestId('l'));
    expect(screen.getByRole('link', { name: 'Home page' })).toBeInTheDocument();
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(
      <Link href="#top" onClick={onClick}>
        Top
      </Link>,
    );
    await userEvent.setup().click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as another component with `as`, passing href through', () => {
    const Router = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
      function Router(props, ref) {
        return (
          <a ref={ref} data-router="" {...props}>
            {props.children}
          </a>
        );
      },
    );
    render(
      <Link as={Router} href="/about">
        About
      </Link>,
    );
    const link = screen.getByRole('link', { name: 'About' });
    expect(link).toHaveAttribute('data-router');
    expect(link).toHaveAttribute('href', '/about');
    expect(link).toHaveClass('axon-link');
  });

  describe('external', () => {
    it('opens in a new tab safely and says so to assistive technology', () => {
      render(
        <Link href="https://example.com" external>
          Example
        </Link>,
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName('Example (opens in a new tab)');
    });

    it('lets the announcement be translated', () => {
      render(
        <Link href="https://example.com" external externalLabel="(öffnet in neuem Tab)">
          Beispiel
        </Link>,
      );
      expect(screen.getByRole('link')).toHaveAccessibleName('Beispiel (öffnet in neuem Tab)');
    });
  });

  describe('disabled', () => {
    it('drops the href, leaves the tab order and is announced as disabled', () => {
      render(
        <Link href="/x" disabled>
          Nope
        </Link>,
      );
      const link = screen.getByRole('link', { name: 'Nope' });
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
      expect(link).toHaveClass('axon-link--disabled');
    });

    it('ignores clicks', async () => {
      const onClick = vi.fn();
      render(
        <Link href="/x" disabled onClick={onClick}>
          Nope
        </Link>,
      );
      await userEvent.setup().click(screen.getByRole('link'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it('is reachable and activated with the keyboard', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Link href="#" onClick={onClick}>
        Go
      </Link>,
    );
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations (plain, external and disabled)', async () => {
    const { container } = render(
      <p>
        <Link href="/a" underline="always">
          Plain
        </Link>{' '}
        <Link href="https://example.com" external>
          External
        </Link>{' '}
        <Link href="/c" disabled>
          Disabled
        </Link>
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
