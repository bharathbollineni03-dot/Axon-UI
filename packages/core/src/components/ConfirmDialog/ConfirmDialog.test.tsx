import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

const props = (overrides: Partial<ConfirmDialogProps> = {}): ConfirmDialogProps => ({
  open: true,
  title: 'Delete project?',
  description: 'This cannot be undone.',
  onConfirm: () => undefined,
  onCancel: () => undefined,
  ...overrides,
});

const confirm = () => screen.getByRole('button', { name: 'Confirm' });
const cancel = () => screen.getByRole('button', { name: 'Cancel' });

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(<ConfirmDialog {...props({ open: false })} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('is an alertdialog named by its title and described by its description', () => {
    render(<ConfirmDialog {...props()} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Delete project?');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('has Cancel and Confirm buttons and no close button', () => {
    render(<ConfirmDialog {...props()} />);
    expect(cancel()).toBeInTheDocument();
    expect(confirm()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('shows extra content and translated labels', () => {
    render(
      <ConfirmDialog {...props({ confirmLabel: 'Löschen', cancelLabel: 'Abbrechen' })}>
        <strong>Project Apollo</strong>
      </ConfirmDialog>,
    );
    expect(screen.getByText('Project Apollo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
  });

  it('forwards the ref to the dialog and applies className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ConfirmDialog {...props({ className: 'extra' })} ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('alertdialog'));
    expect(ref.current).toHaveClass('axon-modal--sm', 'extra');
  });

  describe('answering', () => {
    it('calls onConfirm when Confirm is pressed', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(<ConfirmDialog {...props({ onConfirm, onCancel })} />);
      await userEvent.setup().click(confirm());
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel for Cancel and for Escape', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...props({ onCancel })} />);
      await user.click(cancel());
      expect(onCancel).toHaveBeenCalledTimes(1);
      await user.keyboard('{Escape}');
      expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('does not cancel on a backdrop press unless asked to', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<ConfirmDialog {...props({ onCancel })} />);
      await user.click(screen.getByRole('alertdialog').parentElement!);
      expect(onCancel).not.toHaveBeenCalled();
      rerender(<ConfirmDialog {...props({ onCancel, closeOnBackdrop: true })} />);
      await user.click(screen.getByRole('alertdialog').parentElement!);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('initial focus', () => {
    it('is Confirm for a normal confirmation', () => {
      render(<ConfirmDialog {...props()} />);
      expect(confirm()).toHaveFocus();
    });

    it('is Cancel for a dangerous one, so a stray Enter does no harm', () => {
      render(<ConfirmDialog {...props({ color: 'danger' })} />);
      expect(cancel()).toHaveFocus();
    });

    it('can be set explicitly', () => {
      render(<ConfirmDialog {...props({ color: 'danger', initialFocus: 'confirm' })} />);
      expect(confirm()).toHaveFocus();
    });
  });

  describe('async confirmation', () => {
    it('shows a busy state until the promise settles', async () => {
      let resolve!: () => void;
      const pending = new Promise<void>((r) => {
        resolve = r;
      });
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ConfirmDialog {...props({ onConfirm: () => pending, onCancel })} />);
      await user.click(confirm());
      expect(confirm()).toHaveAttribute('aria-busy', 'true');
      expect(cancel()).toBeDisabled();
      // Esc is ignored while the work is in progress.
      await user.keyboard('{Escape}');
      expect(onCancel).not.toHaveBeenCalled();
      await act(async () => resolve());
      await waitFor(() => expect(confirm()).not.toHaveAttribute('aria-busy'));
      expect(cancel()).toBeEnabled();
    });

    it('goes back to normal when the promise rejects, and logs the error', async () => {
      const failure = new Error('network down');
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const user = userEvent.setup();
      render(<ConfirmDialog {...props({ onConfirm: () => Promise.reject(failure) })} />);
      await user.click(confirm());
      await waitFor(() => expect(log).toHaveBeenCalledWith(failure));
      expect(confirm()).not.toHaveAttribute('aria-busy');
      expect(cancel()).toBeEnabled();
      log.mockRestore();
    });

    it('can be forced busy with `loading`', () => {
      render(<ConfirmDialog {...props({ loading: true })} />);
      expect(confirm()).toHaveAttribute('aria-busy', 'true');
      expect(cancel()).toBeDisabled();
    });
  });

  it('has no axe violations (normal and dangerous)', async () => {
    const { rerender } = render(<ConfirmDialog {...props()} />);
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    rerender(<ConfirmDialog {...props({ color: 'danger', confirmLabel: 'Delete' })} />);
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
