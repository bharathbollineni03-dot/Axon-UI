import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { createNewsletterSchema, newsletterSchema, NewsletterForm } from './NewsletterForm';

const subscribe = async (user = userEvent.setup(), email = 'ada@example.com') => {
  await user.type(screen.getByLabelText(/^Email/), email);
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
};

describe('NewsletterForm', () => {
  it('renders an email field and a button, without a card by default', () => {
    const { container } = render(<NewsletterForm onSubmit={() => {}} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Subscribe to our newsletter' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
    expect(container.querySelector('.axon-auth-card')).toHaveClass('axon-auth-card--bare');
  });

  it('can be wrapped in a card', () => {
    const { container } = render(<NewsletterForm onSubmit={() => {}} card />);
    expect(container.querySelector('.axon-auth-card')).not.toHaveClass('axon-auth-card--bare');
  });

  it('validates the email', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewsletterForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Email/), 'nope');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the email, with an empty name and consent when not shown', async () => {
    const onSubmit = vi.fn();
    render(<NewsletterForm onSubmit={onSubmit} />);
    await subscribe();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      name: '',
      email: 'ada@example.com',
      consent: false,
    });
  });

  describe('options', () => {
    it('adds a name field', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<NewsletterForm onSubmit={onSubmit} showName />);
      await user.type(screen.getByLabelText('Name'), 'Ada');
      await subscribe(user);
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ name: 'Ada' });
    });

    it('adds a consent checkbox that must be ticked', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<NewsletterForm onSubmit={onSubmit} consentLabel="Send me emails" />);
      await subscribe(user);
      expect(await screen.findByText('Please agree to receive emails.')).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'Send me emails' }));
      await user.click(screen.getByRole('button', { name: 'Subscribe' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('can lay the field and the button on one row', () => {
      const { container } = render(<NewsletterForm onSubmit={() => {}} layout="inline" />);
      const row = container.querySelector('.axon-newsletter-form__row');
      expect(row).toContainElement(screen.getByLabelText(/^Email/));
      expect(row).toContainElement(screen.getByRole('button', { name: 'Subscribe' }));
    });

    it('stacks them by default', () => {
      const { container } = render(<NewsletterForm onSubmit={() => {}} />);
      expect(container.querySelector('.axon-newsletter-form__row')).not.toBeInTheDocument();
    });

    it('translates the labels', () => {
      render(
        <NewsletterForm
          onSubmit={() => {}}
          title="Boletín"
          labels={{ email: 'Correo', submit: 'Suscribirme', emailPlaceholder: 'tu@correo.com' }}
        />,
      );
      expect(screen.getByLabelText(/^Correo/)).toHaveAttribute('placeholder', 'tu@correo.com');
      expect(screen.getByRole('button', { name: 'Suscribirme' })).toBeInTheDocument();
    });
  });

  describe('confirmation', () => {
    it('replaces the form with a confirmation after success', async () => {
      render(<NewsletterForm onSubmit={() => {}} />);
      await subscribe();
      expect(
        await screen.findByRole('heading', { name: 'You are subscribed' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Watch your inbox');
    });

    it('subscribes another address', async () => {
      const user = userEvent.setup();
      render(<NewsletterForm onSubmit={() => {}} />);
      await subscribe(user);
      await user.click(await screen.findByRole('button', { name: 'Subscribe another address' }));
      expect(await screen.findByLabelText(/^Email/)).toHaveValue('');
    });

    it('stays on the form when subscribing fails', async () => {
      render(
        <NewsletterForm
          onSubmit={() => ({ fieldErrors: { email: 'That address is on our blocklist.' } })}
        />,
      );
      await subscribe();
      expect(await screen.findByText('That address is on our blocklist.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'You are subscribed' })).not.toBeInTheDocument();
    });

    it('can be turned off', async () => {
      const onSubmit = vi.fn();
      render(<NewsletterForm onSubmit={onSubmit} showSuccess={false} />);
      await subscribe();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.queryByRole('heading', { name: 'You are subscribed' })).not.toBeInTheDocument();
    });
  });

  it('exports its schema and a factory', () => {
    expect(newsletterSchema.safeParse({ name: '', email: 'a@b.co', consent: false }).success).toBe(
      true,
    );
    expect(
      createNewsletterSchema({ requireConsent: true }).safeParse({
        name: '',
        email: 'a@b.co',
        consent: false,
      }).success,
    ).toBe(false);
  });

  it('has no accessibility violations on the form, inline layout and confirmation', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<NewsletterForm onSubmit={() => {}} showName />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<NewsletterForm onSubmit={() => {}} layout="inline" />);
    expect(await axe(container)).toHaveNoViolations();
    await subscribe(user);
    await screen.findByRole('heading', { name: 'You are subscribed' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
