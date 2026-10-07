import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  createForgotPasswordSchema,
  forgotPasswordSchema,
  ForgotPasswordForm,
} from './ForgotPasswordForm';

const send = async (user = userEvent.setup(), email = 'ada@example.com') => {
  await user.type(screen.getByLabelText(/Email/), email);
  await user.click(screen.getByRole('button', { name: 'Send reset link' }));
};

describe('ForgotPasswordForm', () => {
  it('renders a title, a description, the email field and a button', () => {
    render(<ForgotPasswordForm onSubmit={() => {}} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Forgot your password?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/we will send you a link/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('validates the email', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ForgotPasswordForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Email/), 'nope');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the email', async () => {
    const onSubmit = vi.fn();
    render(<ForgotPasswordForm onSubmit={onSubmit} />);
    await send();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({ email: 'ada@example.com' });
  });

  describe('confirmation', () => {
    it('replaces the form with a "Check your email" message after success', async () => {
      render(<ForgotPasswordForm onSubmit={() => {}} />);
      await send();
      expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('ada@example.com');
      expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    });

    it('goes back to the form with "Use a different email"', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm onSubmit={() => {}} />);
      await send(user);
      await user.click(await screen.findByRole('button', { name: 'Use a different email' }));
      expect(await screen.findByLabelText(/Email/)).toBeInTheDocument();
    });

    it('can be turned off, to handle the next step yourself', async () => {
      const onSubmit = vi.fn();
      render(<ForgotPasswordForm onSubmit={onSubmit} showSuccess={false} />);
      await send();
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    });

    it('translates the confirmation', async () => {
      render(
        <ForgotPasswordForm
          onSubmit={() => {}}
          labels={{
            successTitle: 'Revisa tu correo',
            successMessage: (email) => `Enviamos un enlace a ${email}.`,
          }}
        />,
      );
      await send();
      expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Enviamos un enlace a ada@example.com.');
    });
  });

  describe('failures', () => {
    it('stays on the form when onSubmit returns a field error', async () => {
      render(
        <ForgotPasswordForm
          onSubmit={() => ({ fieldErrors: { email: 'We cannot email that address.' } })}
        />,
      );
      await send();
      expect(await screen.findByText('We cannot email that address.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
    });

    it('stays on the form when onSubmit throws', async () => {
      render(
        <ForgotPasswordForm
          onSubmit={() => {
            throw new Error('Mail service is down.');
          }}
        />,
      );
      await send();
      expect(await screen.findByRole('alert')).toHaveTextContent('Mail service is down.');
      expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
    });

    it('stays on the form when onSubmit reports an error through the helpers', async () => {
      render(
        <ForgotPasswordForm
          onSubmit={(_values, helpers) => helpers.setFormError('Try again later.')}
        />,
      );
      await send();
      expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
      expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
    });
  });

  describe('back link', () => {
    it('links back to sign in', () => {
      render(<ForgotPasswordForm onSubmit={() => {}} backHref="/login" />);
      expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
        'href',
        '/login',
      );
    });

    it('can handle the back click itself, and also shows on the confirmation', async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();
      render(<ForgotPasswordForm onSubmit={() => {}} onBack={onBack} />);
      await user.click(screen.getByRole('link', { name: 'Back to sign in' }));
      expect(onBack).toHaveBeenCalledTimes(1);
      await send(user);
      await screen.findByRole('heading', { name: 'Check your email' });
      expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeInTheDocument();
    });

    it('has no link unless asked for', () => {
      render(<ForgotPasswordForm onSubmit={() => {}} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('exports its schema and a factory', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    const spanish = createForgotPasswordSchema({ invalid: 'Correo no válido.' });
    const result = spanish.safeParse({ email: 'nope' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.message).toBe('Correo no válido.');
  });

  it('has no accessibility violations on the form or the confirmation', async () => {
    const user = userEvent.setup();
    const { container } = render(<ForgotPasswordForm onSubmit={() => {}} backHref="/login" />);
    expect(await axe(container)).toHaveNoViolations();
    await send(user);
    await screen.findByRole('heading', { name: 'Check your email' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
