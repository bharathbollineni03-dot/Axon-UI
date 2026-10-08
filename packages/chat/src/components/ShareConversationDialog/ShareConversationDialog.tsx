import { useState } from 'react';
import { Alert, Button, Modal, TextField } from '@axon/core';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { CheckIcon, CopyIcon } from '../../internal/icons';

export interface ShareConversationDialogLabels {
  title: string;
  /** Said when there is a link. */
  sharedDescription: string;
  /** Said when there is no link yet. */
  unsharedDescription: string;
  linkLabel: string;
  copy: string;
  copied: string;
  copyFailed: string;
  createLink: string;
  stopSharing: string;
  close: string;
  createError: string;
  stopError: string;
}

export const defaultShareConversationDialogLabels: ShareConversationDialogLabels = {
  title: 'Share conversation',
  sharedDescription:
    'Anyone with the link can read this conversation. Messages added after you share are not included.',
  unsharedDescription: 'Create a link to share a read-only copy of this conversation.',
  linkLabel: 'Link to this conversation',
  copy: 'Copy link',
  copied: 'Link copied',
  copyFailed: 'Could not copy. Select the link and copy it yourself.',
  createLink: 'Create link',
  stopSharing: 'Stop sharing',
  close: 'Done',
  createError: 'The link could not be created. Try again.',
  stopError: 'Sharing could not be stopped. Try again.',
};

export interface ShareConversationDialogProps {
  open: boolean;
  onClose: () => void;
  /** The share link, when the conversation is already shared. */
  url?: string | null;
  /** Creates a link and resolves with it. Shows a "Create link" button while there is no link. */
  onCreateLink?: () => Promise<string>;
  /** Makes the link stop working. Shows a "Stop sharing" button while there is a link. */
  onStopSharing?: () => void | Promise<unknown>;
  labels?: Partial<ShareConversationDialogLabels>;
}

interface BodyProps extends Omit<ShareConversationDialogProps, 'open'> {
  labels: ShareConversationDialogLabels;
}

function ShareBody({ onClose, url, onCreateLink, onStopSharing, labels }: BodyProps) {
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const link = url ?? createdUrl;

  const create = async () => {
    if (!onCreateLink) return;
    setError(null);
    setBusy('create');
    try {
      setCreatedUrl(await onCreateLink());
    } catch {
      setError(labels.createError);
    } finally {
      setBusy(null);
    }
  };

  const stop = async () => {
    if (!onStopSharing) return;
    setError(null);
    setBusy('stop');
    try {
      await onStopSharing();
      setCreatedUrl(null);
    } catch {
      setError(labels.stopError);
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    setCopyFailed(!(await copy(link)));
  };

  return (
    <div className="axon-share">
      <p className="axon-share__description">
        {link ? labels.sharedDescription : labels.unsharedDescription}
      </p>

      {error ? (
        <Alert status="danger" role="alert">
          {error}
        </Alert>
      ) : null}

      {link ? (
        <div className="axon-share__link">
          <TextField
            fullWidth
            readOnly
            type="url"
            label={labels.linkLabel}
            value={link}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            variant="outline"
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
            onClick={copyLink}
          >
            {copied ? labels.copied : labels.copy}
          </Button>
        </div>
      ) : onCreateLink ? (
        <Button className="axon-share__create" loading={busy === 'create'} onClick={create}>
          {labels.createLink}
        </Button>
      ) : null}

      <span className="axon-visually-hidden" role="status">
        {copied ? labels.copied : copyFailed ? labels.copyFailed : ''}
      </span>
      {copyFailed && !copied ? (
        <p className="axon-share__hint" aria-hidden="true">
          {labels.copyFailed}
        </p>
      ) : null}

      <div className="axon-share__footer">
        {link && onStopSharing ? (
          <Button variant="ghost" color="danger" loading={busy === 'stop'} onClick={stop}>
            {labels.stopSharing}
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onClose}>{labels.close}</Button>
      </div>
    </div>
  );
}

/**
 * A dialog for sharing a conversation by link: shows the link with a copy button, creates one on
 * request, and can stop sharing. It does not talk to a server; you provide `onCreateLink` and
 * `onStopSharing`.
 */
export function ShareConversationDialog({
  open,
  onClose,
  labels: labelsProp,
  ...rest
}: ShareConversationDialogProps) {
  const labels = { ...defaultShareConversationDialogLabels, ...labelsProp };
  return (
    <Modal open={open} onClose={onClose} size="md" title={labels.title}>
      <ShareBody {...rest} onClose={onClose} labels={labels} />
    </Modal>
  );
}
