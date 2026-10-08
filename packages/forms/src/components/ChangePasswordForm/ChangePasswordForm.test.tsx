import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  changePasswordSchema,
  createChangePasswordSchema,
  ChangePasswordForm,
} from './ChangePasswordForm';

async function fill(user = userEvent.setup(), current = 'OldPass-123', next = 'Sup3r-secret!') {
  await user.type(screen.getByLabelText(/Current password/), current);
  await user.type(screen.getByLabelText(/^New password/), next);
  await user.type(screen.getByLabelText(/Confirm new password/), next);
}

describe('ChangePasswordForm', () => {
  it('renders the three fields under a level 2 heading by default', () => {
    render(<ChangePasswordForm onSubmit={() => {}} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Change password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('meter')).toBeInTheDocument();
  });

  it('validates every field', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Enter your current password.')).toBeInTheDocument();
    expect(screen.getByText('Enter a new password.')).toBeInTheDocument();
    expect(screen.getByText('Confirm your new password.')).toBeInTheDocument();
  });

  it('rejects a mismatch, and a new password equal to the current one', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={() => {}} />);
    await fill(user, 'Sup3r-secret!', 'Sup3r-secret!');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(
      await screen.findByText('Choose a password you have not used here before.'),
    ).toBeInTheDocument();
  });

  it('can allow the same password', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} disallowSamePassword={false} />);
    await fill(user, 'Sup3r-secret!', 'Sup3r-secret!');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('submits the three values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordForm onSubmit={onSubmit} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      currentPassword: 'OldPass-123',
      newPassword: 'Sup3r-secret!',
      confirmPassword: 'Sup3r-secret!',
    });
  });

  it('maps a wrong-current-password error from the server', async () => {
    const user = userEvent.setup();
    render(
      <ChangePasswordForm
        onSubmit={() => ({ fieldErrors: { currentPassword: 'That is not your password.' } })}
      />,
    );
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('That is not your password.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('can stay disabled-looking while submitting', async () => {
    let finish: () => void = () => {};
    const user = userEvent.setup();
    render(
      <ChangePasswordForm onSubmit={() => new Promise<void>((resolve) => (finish = resolve))} />,
    );
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Change password' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );
    finish();
  });

  it('exports its schema and a factory', () => {
    const valid = { currentPassword: 'old', newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' };
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: 'abcdefgh' }).success).toBe(
      false,
    );
    expect(
      createChangePasswordSchema({ disallowSamePassword: false }).safeParse({
        ...valid,
        currentPassword: 'abcdefgh',
      }).success,
    ).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ChangePasswordForm onSubmit={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
