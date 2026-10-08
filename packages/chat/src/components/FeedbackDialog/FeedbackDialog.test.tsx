import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import { FeedbackDialog, type FeedbackDialogProps } from './FeedbackDialog';

function renderDialog(props: Partial<FeedbackDialogProps> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  const utils = render(<FeedbackDialog open onClose={onClose} onSubmit={onSubmit} {...props} />);
  return { ...utils, onClose, onSubmit };
}

const dialog = () => screen.getByRole('dialog', { name: 'Give feedback' });
const send = () => screen.getByRole('button', { name: 'Send feedback' });
const chip = (name: string) => screen.getByRole('button', { name });

describe('FeedbackDialog', () => {
  it('renders nothing while closed', () => {
    render(<FeedbackDialog open={false} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a dialog with a title and a description', () => {
    renderDialog();
    expect(dialog()).toHaveAccessibleDescription(/Tell us how this response was/);
    expect(
      within(dialog()).getByRole('radiogroup', { name: 'How was this response?' }),
    ).toBeInTheDocument();
  });

  it('has a good and a bad response choice, neither chosen at first', () => {
    renderDialog();
    expect(screen.getByRole('radio', { name: 'Good response' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Bad response' })).not.toBeChecked();
    expect(screen.queryByRole('group', { name: 'What stood out?' })).not.toBeInTheDocument();
  });

  it('can start on a rating, such as the thumb that was pressed', () => {
    renderDialog({ defaultRating: 'down' });
    expect(screen.getByRole('radio', { name: 'Bad response' })).toBeChecked();
    expect(chip('Not accurate')).toBeInTheDocument();
  });

  it('offers reasons that fit the rating, and drops them when it changes', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    expect(chip('Accurate')).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip('Accurate'));
    expect(chip('Accurate')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('radio', { name: 'Bad response' }));
    expect(screen.queryByRole('button', { name: 'Accurate' })).not.toBeInTheDocument();
    expect(chip('Not accurate')).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    expect(chip('Accurate')).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets reasons be switched on and off', async () => {
    const user = userEvent.setup();
    renderDialog({ defaultRating: 'up' });
    await user.click(chip('Helpful'));
    await user.click(chip('Clear and well written'));
    await user.click(chip('Helpful'));
    expect(chip('Helpful')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Clear and well written')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sends the rating, the reasons and the trimmed comment', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    await user.click(screen.getByRole('radio', { name: 'Bad response' }));
    await user.click(chip('Not accurate'));
    await user.click(chip('Too long or off topic'));
    await user.type(screen.getByRole('textbox', { name: /Anything else/ }), '  It was wrong.  ');
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 'down',
      reasons: ['inaccurate', 'verbose'],
      comment: 'It was wrong.',
    });
  });

  it('needs a rating before it sends', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    await user.click(send());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText('Choose good or bad response.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('can ask for a comment with a bad response only', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ requireCommentOnDown: true });
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('radio', { name: 'Bad response' }));
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const comment = screen.getByRole('textbox', { name: /Anything else/ });
    expect(await screen.findByText('Add a few words about what went wrong.')).toBeInTheDocument();
    expect(comment).toHaveAttribute('aria-invalid', 'true');
    await user.type(comment, 'It missed the point');
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('uses the reasons you give', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({
      reasons: { down: [{ id: 'slow', label: 'Too slow' }] },
      defaultRating: 'down',
    });
    expect(screen.queryByRole('button', { name: 'Not accurate' })).not.toBeInTheDocument();
    await user.click(chip('Too slow'));
    await user.click(send());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reasons: ['slow'] }));
    // The reasons for a good response keep their defaults.
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    expect(chip('Accurate')).toBeInTheDocument();
  });

  describe('sending takes time', () => {
    it('shows a busy state and stops further changes while it waits', async () => {
      const user = userEvent.setup();
      let finish = () => {};
      const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      renderDialog({ onSubmit, defaultRating: 'up' });
      await user.click(send());
      expect(send()).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(chip('Helpful')).toBeDisabled();
      await user.click(send());
      expect(onSubmit).toHaveBeenCalledTimes(1);
      finish();
      await waitFor(() => expect(send()).not.toHaveAttribute('aria-busy', 'true'));
    });

    it('shows an error when it fails, and lets people try again', async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(undefined);
      renderDialog({ onSubmit, defaultRating: 'up' });
      await user.click(send());
      expect(await screen.findByRole('alert')).toHaveTextContent('Your feedback could not be sent');
      await user.click(send());
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });

  it('closes with Cancel and with Escape, without sending', async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts fresh each time it opens', async () => {
    const user = userEvent.setup();
    const props = { onClose: () => {}, onSubmit: () => {} };
    const { rerender } = render(<FeedbackDialog open {...props} />);
    await user.click(screen.getByRole('radio', { name: 'Good response' }));
    await user.type(screen.getByRole('textbox', { name: /Anything else/ }), 'Great');
    rerender(<FeedbackDialog open={false} {...props} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    rerender(<FeedbackDialog open {...props} />);
    expect(screen.getByRole('radio', { name: 'Good response' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: /Anything else/ })).toHaveValue('');
  });

  it('shows extra content above the form', () => {
    renderDialog({ children: <blockquote>The answer in question</blockquote> });
    expect(screen.getByText('The answer in question')).toBeInTheDocument();
  });

  it('can be translated', () => {
    renderDialog({
      labels: {
        title: 'Comentarios',
        up: 'Buena',
        down: 'Mala',
        submit: 'Enviar',
        cancel: 'Cancelar',
      },
    });
    expect(screen.getByRole('dialog', { name: 'Comentarios' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Buena' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('has no accessibility violations, empty, filled or with errors', async () => {
    const user = userEvent.setup();
    renderDialog({ requireCommentOnDown: true });
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    await user.click(send());
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    await user.click(screen.getByRole('radio', { name: 'Bad response' }));
    await user.click(chip('Not accurate'));
    await user.click(send());
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
