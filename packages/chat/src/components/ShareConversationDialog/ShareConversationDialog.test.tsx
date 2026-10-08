import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeWithPortal } from '../../testing/axePortal';
import {
  ShareConversationDialog,
  type ShareConversationDialogProps,
} from './ShareConversationDialog';

const URL_ONE = 'https://chat.example.com/s/abc123';

function renderDialog(props: Partial<ShareConversationDialogProps> = {}) {
  const onClose = vi.fn();
  const utils = render(<ShareConversationDialog open onClose={onClose} {...props} />);
  return { ...utils, onClose };
}

const linkField = () => screen.getByLabelText('Link to this conversation');

describe('ShareConversationDialog', () => {
  it('renders nothing while closed', () => {
    render(<ShareConversationDialog open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a dialog named "Share conversation"', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Share conversation' })).toBeInTheDocument();
  });

  describe('before there is a link', () => {
    it('explains, and offers to create one when it can', () => {
      renderDialog({ onCreateLink: async () => URL_ONE });
      expect(screen.getByText(/Create a link to share a read-only copy/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create link' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Link to this conversation')).not.toBeInTheDocument();
    });

    it('has no create button without a way to create one', () => {
      renderDialog();
      expect(screen.queryByRole('button', { name: 'Create link' })).not.toBeInTheDocument();
    });

    it('creates the link and shows it', async () => {
      const user = userEvent.setup();
      const onCreateLink = vi.fn(async () => URL_ONE);
      renderDialog({ onCreateLink });
      await user.click(screen.getByRole('button', { name: 'Create link' }));
      expect(onCreateLink).toHaveBeenCalledTimes(1);
      expect(await screen.findByLabelText('Link to this conversation')).toHaveValue(URL_ONE);
      expect(screen.getByText(/Anyone with the link can read/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create link' })).not.toBeInTheDocument();
    });

    it('shows a busy state while creating', async () => {
      const user = userEvent.setup();
      let finish: (url: string) => void = () => {};
      renderDialog({ onCreateLink: () => new Promise<string>((resolve) => (finish = resolve)) });
      await user.click(screen.getByRole('button', { name: 'Create link' }));
      expect(screen.getByRole('button', { name: 'Create link' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
      finish(URL_ONE);
      expect(await screen.findByLabelText('Link to this conversation')).toBeInTheDocument();
    });

    it('shows an error when it fails, and lets people try again', async () => {
      const user = userEvent.setup();
      const onCreateLink = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(URL_ONE);
      renderDialog({ onCreateLink });
      await user.click(screen.getByRole('button', { name: 'Create link' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('The link could not be created');
      await user.click(screen.getByRole('button', { name: 'Create link' }));
      expect(await screen.findByLabelText('Link to this conversation')).toHaveValue(URL_ONE);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('with a link', () => {
    it('shows it in a read-only field that selects itself when focused', async () => {
      const user = userEvent.setup();
      renderDialog({ url: URL_ONE });
      const field = linkField() as HTMLInputElement;
      expect(field).toHaveValue(URL_ONE);
      expect(field).toHaveAttribute('readonly');
      await user.click(field);
      expect(field.selectionStart).toBe(0);
      expect(field.selectionEnd).toBe(URL_ONE.length);
    });

    it('copies the link, and says so', async () => {
      const user = userEvent.setup();
      renderDialog({ url: URL_ONE });
      await user.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(await navigator.clipboard.readText()).toBe(URL_ONE);
      // "Copied" lasts two seconds, and role queries can take that long on a busy machine, so look
      // for both the button label and the live region with one cheap text query.
      const shown = await screen.findAllByText('Link copied');
      expect(shown.some((el) => el.closest('button'))).toBe(true);
      expect(shown.some((el) => el.getAttribute('role') === 'status')).toBe(true);
    });

    it('tells people when copying did not work', async () => {
      const user = userEvent.setup();
      renderDialog({ url: URL_ONE });
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
      await user.click(screen.getByRole('button', { name: 'Copy link' }));
      await waitFor(() => expect(screen.getAllByText(/Could not copy/).length).toBeGreaterThan(0));
      expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    });

    it('stops sharing, and goes back to offering a link', async () => {
      const user = userEvent.setup();
      const onStopSharing = vi.fn(async () => {});
      renderDialog({ onCreateLink: async () => URL_ONE, onStopSharing });
      await user.click(screen.getByRole('button', { name: 'Create link' }));
      await screen.findByLabelText('Link to this conversation');
      await user.click(screen.getByRole('button', { name: 'Stop sharing' }));
      expect(onStopSharing).toHaveBeenCalledTimes(1);
      expect(await screen.findByRole('button', { name: 'Create link' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Link to this conversation')).not.toBeInTheDocument();
    });

    it('keeps showing the link you pass in until you change it', async () => {
      const user = userEvent.setup();
      const onStopSharing = vi.fn();
      const { rerender, onClose } = renderDialog({ url: URL_ONE, onStopSharing });
      await user.click(screen.getByRole('button', { name: 'Stop sharing' }));
      expect(onStopSharing).toHaveBeenCalledTimes(1);
      expect(linkField()).toHaveValue(URL_ONE);
      rerender(
        <ShareConversationDialog open onClose={onClose} url={null} onStopSharing={onStopSharing} />,
      );
      expect(screen.queryByLabelText('Link to this conversation')).not.toBeInTheDocument();
    });

    it('shows an error when stopping fails, and keeps the link', async () => {
      const user = userEvent.setup();
      renderDialog({
        url: URL_ONE,
        onStopSharing: async () => {
          throw new Error('nope');
        },
      });
      await user.click(screen.getByRole('button', { name: 'Stop sharing' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Sharing could not be stopped');
      expect(linkField()).toHaveValue(URL_ONE);
    });

    it('has no "Stop sharing" without a handler', () => {
      renderDialog({ url: URL_ONE });
      expect(screen.queryByRole('button', { name: 'Stop sharing' })).not.toBeInTheDocument();
    });
  });

  it('closes with Done and with Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ url: URL_ONE });
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('can be translated', () => {
    renderDialog({
      url: URL_ONE,
      onStopSharing: () => {},
      labels: {
        title: 'Compartir',
        copy: 'Copiar enlace',
        stopSharing: 'Dejar de compartir',
        close: 'Listo',
        linkLabel: 'Enlace',
      },
    });
    expect(screen.getByRole('dialog', { name: 'Compartir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dejar de compartir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enlace')).toBeInTheDocument();
  });

  it('has no accessibility violations, with and without a link', async () => {
    const { rerender, onClose } = renderDialog({ onCreateLink: async () => URL_ONE });
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
    rerender(
      <ShareConversationDialog open onClose={onClose} url={URL_ONE} onStopSharing={() => {}} />,
    );
    expect(await axeWithPortal(document.body)).toHaveNoViolations();
  });
});
