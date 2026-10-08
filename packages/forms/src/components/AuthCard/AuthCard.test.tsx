import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { AuthCard } from './AuthCard';

describe('AuthCard', () => {
  it('renders a region named by its title, with a level 1 heading', () => {
    render(<AuthCard title="Sign in">Body</AuthCard>);
    expect(screen.getByRole('region', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the logo, description, children and footer', () => {
    render(
      <AuthCard
        logo={<img alt="Acme" src="/logo.svg" />}
        title="Welcome"
        description="Please sign in."
        footer={<a href="/help">Need help?</a>}
      >
        <p>Form goes here</p>
      </AuthCard>,
    );
    expect(screen.getByRole('img', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByText('Please sign in.')).toBeInTheDocument();
    expect(screen.getByText('Form goes here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Need help?' })).toBeInTheDocument();
  });

  it('uses the heading level you choose', () => {
    render(<AuthCard title="Account" headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Account' })).toBeInTheDocument();
  });

  it('has no header when there is nothing for it, and no region name', () => {
    const { container } = render(<AuthCard>Body</AuthCard>);
    expect(container.querySelector('header')).not.toBeInTheDocument();
    expect(container.querySelector('footer')).not.toBeInTheDocument();
    expect(screen.getByText('Body').closest('section')).not.toHaveAttribute('aria-labelledby');
  });

  it('applies the size and bare modifiers', () => {
    const { container, rerender } = render(<AuthCard title="A" />);
    expect(container.querySelector('.axon-auth-card')).toHaveClass('axon-auth-card--sm');
    rerender(<AuthCard title="A" size="lg" bare />);
    expect(container.querySelector('.axon-auth-card')).toHaveClass(
      'axon-auth-card--lg',
      'axon-auth-card--bare',
    );
  });

  it('can center itself in the viewport, moving className to the page wrapper', () => {
    const { container } = render(<AuthCard title="A" centered className="extra" />);
    const page = container.querySelector('.axon-auth-page');
    expect(page).toHaveClass('extra');
    expect(page).toContainElement(container.querySelector('.axon-auth-card'));
    expect(container.querySelector('.axon-auth-card')).not.toHaveClass('extra');
  });

  it('forwards the ref and spreads props onto the card', () => {
    const ref = createRef<HTMLElement>();
    render(<AuthCard ref={ref} title="A" className="extra" data-testid="card" />);
    expect(ref.current).toBe(screen.getByTestId('card'));
    expect(ref.current).toHaveClass('axon-auth-card', 'extra');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <AuthCard title="Sign in" description="Welcome" footer={<a href="/x">Help</a>}>
        <button>Go</button>
      </AuthCard>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
