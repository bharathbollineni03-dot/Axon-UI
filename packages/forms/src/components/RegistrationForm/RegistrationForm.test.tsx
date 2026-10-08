import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FormTextField } from '../FormBindings/FormBindings';
import {
  createRegistrationSchema,
  registrationSchema,
  RegistrationForm,
  type RegistrationValues,
} from './RegistrationForm';

async function fillAll(user = userEvent.setup(), password = 'Sup3r-secret!') {
  await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
  await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), password);
  await user.type(screen.getByLabelText(/Confirm password/), password);
  await user.click(screen.getByRole('checkbox'));
}

describe('RegistrationForm', () => {
  it('renders the fields, with autocomplete hints for password managers', () => {
    render(<RegistrationForm onSubmit={() => {}} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^Password/, { selector: 'input' })).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText(/Confirm password/)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByRole('checkbox', { name: /terms/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  describe('validation', () => {
    it('asks for every field and the terms', async () => {
      const onSubmit = vi.fn();
      render(<RegistrationForm onSubmit={onSubmit} />);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
      expect(screen.getByText('Enter a password.')).toBeInTheDocument();
      expect(screen.getByText('Confirm your password.')).toBeInTheDocument();
      expect(screen.getByText('You need to accept the terms to continue.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects a short password', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={() => {}} />);
      await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'short');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument();
    });

    it('rejects a confirmation that does not match, on the confirmation field', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={() => {}} />);
      await fillAll(user);
      await user.clear(screen.getByLabelText(/Confirm password/));
      await user.type(screen.getByLabelText(/Confirm password/), 'different');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm password/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('applies the password rules you set', async () => {
      const user = userEvent.setup();
      render(
        <RegistrationForm
          onSubmit={() => {}}
          passwordRules={{ minLength: 12, requireNumber: true }}
        />,
      );
      await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'abcdefghijkl');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('Include a number.')).toBeInTheDocument();
    });
  });

  describe('submitting', () => {
    it('submits the values', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={onSubmit} />);
      await fillAll(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toEqual({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'Sup3r-secret!',
        confirmPassword: 'Sup3r-secret!',
        acceptTerms: true,
      });
    });

    it('maps a server error onto the email field', async () => {
      const user = userEvent.setup();
      render(
        <RegistrationForm
          onSubmit={() => ({ fieldErrors: { email: 'That email is already registered.' } })}
        />,
      );
      await fillAll(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('That email is already registered.')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows a banner for a form-level error', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={() => ({ formError: 'Sign-ups are closed.' })} />);
      await fillAll(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Sign-ups are closed.');
    });
  });

  describe('password strength', () => {
    it('shows a meter that follows the password', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={() => {}} />);
      expect(screen.getByRole('meter', { name: 'Password strength' })).toHaveAttribute(
        'aria-valuenow',
        '0',
      );
      await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'Sup3r-secret!');
      await waitFor(() =>
        expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Strong'),
      );
    });

    it('can leave the meter out', () => {
      render(<RegistrationForm onSubmit={() => {}} showPasswordStrength={false} />);
      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    });

    it('translates the meter', () => {
      render(
        <RegistrationForm
          onSubmit={() => {}}
          labels={{ passwordStrength: { meter: 'Seguridad' } }}
        />,
      );
      expect(screen.getByRole('meter', { name: 'Seguridad' })).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it('can drop the terms checkbox', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={onSubmit} requireTerms={false} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      await user.type(screen.getByLabelText(/Full name/), 'Ada');
      await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
      await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'Sup3r-secret!');
      await user.type(screen.getByLabelText(/Confirm password/), 'Sup3r-secret!');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('takes rich terms, such as links', () => {
      render(
        <RegistrationForm
          onSubmit={() => {}}
          labels={{
            terms: (
              <>
                I accept the <a href="/terms">terms</a>
              </>
            ),
          }}
        />,
      );
      expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/terms');
    });

    it('translates the labels', () => {
      render(
        <RegistrationForm
          onSubmit={() => {}}
          title="Crear cuenta"
          labels={{ name: 'Nombre', email: 'Correo', submit: 'Registrarme' }}
        />,
      );
      expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Registrarme' })).toBeInTheDocument();
    });

    it('forwards the ref to the form', () => {
      const ref = createRef<HTMLFormElement>();
      render(<RegistrationForm ref={ref} onSubmit={() => {}} />);
      expect(ref.current?.tagName).toBe('FORM');
    });
  });

  describe('extending', () => {
    it('exports its schema and a factory', () => {
      const valid = {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'Sup3r-secret!',
        confirmPassword: 'Sup3r-secret!',
        acceptTerms: true,
      };
      expect(registrationSchema.safeParse(valid).success).toBe(true);
      expect(registrationSchema.safeParse({ ...valid, confirmPassword: 'x' }).success).toBe(false);
      const noTerms = createRegistrationSchema({ requireTerms: false });
      expect(noTerms.safeParse({ ...valid, acceptTerms: false }).success).toBe(true);
    });

    it('can be extended with safeExtend, keeping the password check', () => {
      const extended = registrationSchema.safeExtend({ company: z.string().min(1) });
      const base = {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'Sup3r-secret!',
        acceptTerms: true,
        company: 'Analytical Engines',
      };
      expect(extended.safeParse({ ...base, confirmPassword: 'Sup3r-secret!' }).success).toBe(true);
      expect(extended.safeParse({ ...base, confirmPassword: 'nope' }).success).toBe(false);
    });

    it('renders extra fields passed as children, validated by the extended schema', async () => {
      const extended = registrationSchema.safeExtend({
        company: z.string().min(1, 'Enter your company.'),
      });
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <RegistrationForm
          onSubmit={onSubmit}
          schema={extended as never}
          defaultValues={{ company: '' }}
        >
          <FormTextField name="company" label="Company" />
        </RegistrationForm>,
      );
      await fillAll(user);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(await screen.findByText('Enter your company.')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Company'), 'Analytical Engines');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ company: 'Analytical Engines' });
    });

    it('has values typed as RegistrationValues', () => {
      const values: RegistrationValues = {
        name: 'a',
        email: 'b',
        password: 'c',
        confirmPassword: 'c',
        acceptTerms: true,
      };
      expect(values.acceptTerms).toBe(true);
    });
  });

  it('has no accessibility violations, including with errors showing', async () => {
    const user = userEvent.setup();
    const { container } = render(<RegistrationForm onSubmit={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText('Enter your name.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
