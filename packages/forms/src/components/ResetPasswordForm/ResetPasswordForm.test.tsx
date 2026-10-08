import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  createResetPasswordSchema,
  resetPasswordSchema,
  ResetPasswordForm,
} from './ResetPasswordForm';

describe('ResetPasswordForm', () => {
  it('renders a new password, a confirmation and a meter', () => {
    render(<ResetPasswordForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/Confirm new password/)).toBeInTheDocument();
    expect(screen.getByRole('meter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
  });

  it('validates the password and the confirmation', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm onSubmit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Enter a new password.')).toBeInTheDocument();
    expect(screen.getByText('Confirm your new password.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^New password/), 'Sup3r-secret!');
    await user.type(screen.getByLabelText(/Confirm new password/), 'other');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument();
  });

  it('submits the password and its confirmation', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ResetPasswordForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/^New password/), 'Sup3r-secret!');
    await user.type(screen.getByLabelText(/Confirm new password/), 'Sup3r-secret!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      password: 'Sup3r-secret!',
      confirmPassword: 'Sup3r-secret!',
    });
  });

  it('shows an expired-link error from the server', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm onSubmit={() => ({ formError: 'This reset link has expired.' })} />);
    await user.type(screen.getByLabelText(/^New password/), 'Sup3r-secret!');
    await user.type(screen.getByLabelText(/Confirm new password/), 'Sup3r-secret!');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This reset link has expired.');
  });

  it('applies password rules, and can hide the meter', async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordForm
        onSubmit={() => {}}
        showPasswordStrength={false}
        passwordRules={{ requireSymbol: true }}
      />,
    );
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^New password/), 'abcdefgh');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Include a symbol, such as ! or #.')).toBeInTheDocument();
  });

  it('exports its schema and a factory', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'abcdefgh', confirmPassword: 'abcdefgh' }).success,
    ).toBe(true);
    const spanish = createResetPasswordSchema({
      messages: { passwordMismatch: 'No coinciden.' },
    });
    const result = spanish.safeParse({ password: 'abcdefgh', confirmPassword: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.message).toBe('No coinciden.');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ResetPasswordForm onSubmit={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
