import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FormTextField } from '../FormBindings/FormBindings';
import { createLoginSchema, loginSchema, LoginForm, type LoginValues } from './LoginForm';

const fill = async (user = userEvent.setup(), email = 'ada@example.com', password = 'secret') => {
  await user.type(screen.getByLabelText(/Email/), email);
  await user.type(screen.getByLabelText(/Password/), password);
};

describe('LoginForm', () => {
  it('renders a card with a title and the fields', () => {
    render(<LoginForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  describe('validation', () => {
    it('asks for both fields', async () => {
      const onSubmit = vi.fn();
      render(<LoginForm onSubmit={onSubmit} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
      expect(screen.getByText('Enter your password.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('checks the email format', async () => {
      const user = userEvent.setup();
      render(<LoginForm onSubmit={() => {}} />);
      await fill(user, 'not-an-email');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('calls onSubmit with the identifier, password and remember choice', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm onSubmit={onSubmit} />);
      await fill(user);
      await user.click(screen.getByRole('checkbox', { name: 'Remember me' }));
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        identifier: 'ada@example.com',
        password: 'secret',
        remember: true,
      });
    });

    it('trims the email', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm onSubmit={onSubmit} />);
      await fill(user, '  ada@example.com  ');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].identifier).toBe('ada@example.com');
    });

    it('shows a busy button while the submit is pending', async () => {
      let finish: () => void = () => {};
      const user = userEvent.setup();
      render(<LoginForm onSubmit={() => new Promise<void>((resolve) => (finish = resolve))} />);
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute(
          'aria-busy',
          'true',
        ),
      );
      finish();
    });

    it('maps a server error onto the password field', async () => {
      const user = userEvent.setup();
      render(
        <LoginForm
          onSubmit={() => ({ fieldErrors: { password: 'That password is not right.' } })}
        />,
      );
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('That password is not right.')).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows a thrown error in the banner', async () => {
      const user = userEvent.setup();
      render(
        <LoginForm
          onSubmit={() => {
            throw new Error('Too many attempts. Try again later.');
          }}
        />,
      );
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.');
    });

    it('shows an error you pass in', () => {
      render(<LoginForm onSubmit={() => {}} error="Your session expired. Sign in again." />);
      expect(screen.getByRole('alert')).toHaveTextContent('Your session expired.');
    });
  });

  describe('identifier', () => {
    it('takes a username without checking for an email', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm identifier="username" onSubmit={onSubmit} />);
      expect(screen.getByLabelText(/Username/)).toHaveAttribute('type', 'text');
      await user.type(screen.getByLabelText(/Username/), 'ada');
      await user.type(screen.getByLabelText(/Password/), 'secret');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].identifier).toBe('ada');
    });

    it('asks for the username when it is empty', async () => {
      render(<LoginForm identifier="username" onSubmit={() => {}} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    });

    it('accepts either an email or a username', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<LoginForm identifier="either" onSubmit={onSubmit} />);
      await user.type(screen.getByLabelText(/Email or username/), 'ada');
      await user.type(screen.getByLabelText(/Password/), 'secret');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });
  });

  describe('options', () => {
    it('hides "Remember me" on request', () => {
      render(<LoginForm onSubmit={() => {}} showRememberMe={false} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('links to a forgot-password page', () => {
      render(<LoginForm onSubmit={() => {}} forgotPasswordHref="/forgot" />);
      expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
        'href',
        '/forgot',
      );
    });

    it('can handle the forgot-password click itself', async () => {
      const onForgotPassword = vi.fn();
      render(<LoginForm onSubmit={() => {}} onForgotPassword={onForgotPassword} />);
      await userEvent.setup().click(screen.getByRole('link', { name: 'Forgot password?' }));
      expect(onForgotPassword).toHaveBeenCalledTimes(1);
    });

    it('has no forgot-password link unless asked for', () => {
      render(<LoginForm onSubmit={() => {}} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows social login buttons under an "or" divider', () => {
      render(
        <LoginForm
          onSubmit={() => {}}
          socialLogins={<button type="button">Continue with Acme</button>}
        />,
      );
      expect(screen.getByRole('button', { name: 'Continue with Acme' })).toBeInTheDocument();
      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('takes a logo, title, description and footer', () => {
      render(
        <LoginForm
          onSubmit={() => {}}
          logo={<img alt="Acme" src="/logo.svg" />}
          title="Welcome back"
          description="Sign in to continue."
          footer={<a href="/signup">Create an account</a>}
        />,
      );
      expect(screen.getByRole('img', { name: 'Acme' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      expect(screen.getByText('Sign in to continue.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument();
    });

    it('translates every label', () => {
      render(
        <LoginForm
          onSubmit={() => {}}
          title="Iniciar sesión"
          forgotPasswordHref="/olvide"
          labels={{
            email: 'Correo',
            password: 'Contraseña',
            remember: 'Recordarme',
            forgotPassword: '¿Olvidaste tu contraseña?',
            submit: 'Entrar',
          }}
        />,
      );
      expect(screen.getByLabelText(/Correo/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Recordarme' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    it('uses the heading level you choose', () => {
      render(<LoginForm onSubmit={() => {}} headingLevel={2} />);
      expect(screen.getByRole('heading', { level: 2, name: 'Sign in' })).toBeInTheDocument();
    });

    it('can drop the card, and can center itself on the page', () => {
      const { container, rerender } = render(<LoginForm onSubmit={() => {}} card={false} />);
      expect(container.querySelector('.axon-auth-card')).toHaveClass('axon-auth-card--bare');
      rerender(<LoginForm onSubmit={() => {}} centered />);
      expect(container.querySelector('.axon-auth-page')).toBeInTheDocument();
    });

    it('starts from defaultValues', () => {
      render(<LoginForm onSubmit={() => {}} defaultValues={{ identifier: 'ada@example.com' }} />);
      expect(screen.getByLabelText(/Email/)).toHaveValue('ada@example.com');
    });

    it('can be disabled', () => {
      render(<LoginForm onSubmit={() => {}} disabled />);
      expect(screen.getByLabelText(/Email/)).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    it('forwards the ref to the form and merges className onto the card', () => {
      const ref = createRef<HTMLFormElement>();
      render(<LoginForm ref={ref} onSubmit={() => {}} className="extra" />);
      expect(ref.current?.tagName).toBe('FORM');
      expect(document.querySelector('.axon-auth-card')).toHaveClass('extra');
    });
  });

  describe('extending', () => {
    it('exports its schema, and a factory for other messages', () => {
      expect(
        loginSchema.safeParse({ identifier: 'a@b.co', password: 'x', remember: false }).success,
      ).toBe(true);
      const spanish = createLoginSchema({
        messages: { passwordRequired: 'Escribe tu contraseña.' },
      });
      const result = spanish.safeParse({ identifier: 'a@b.co', password: '', remember: false });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]!.message).toBe('Escribe tu contraseña.');
    });

    it('takes an extended schema, with extra fields passed as children', async () => {
      const extended = loginSchema.safeExtend({ otp: z.string().min(1, 'Enter your code.') });
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <LoginForm onSubmit={onSubmit} schema={extended as never} defaultValues={{ otp: '' }}>
          <FormTextField name="otp" label="Code" />
        </LoginForm>,
      );
      await fill(user);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(await screen.findByText('Enter your code.')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Code'), '123456');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ otp: '123456' });
    });

    it('has values typed as LoginValues', () => {
      const values: LoginValues = { identifier: 'a', password: 'b', remember: true };
      expect(values.remember).toBe(true);
    });
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LoginForm
        onSubmit={() => {}}
        forgotPasswordHref="/forgot"
        socialLogins={<button type="button">Continue with Acme</button>}
        footer={<a href="/signup">Create an account</a>}
        logo={<img alt="Acme" src="/logo.svg" />}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Enter your password.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
