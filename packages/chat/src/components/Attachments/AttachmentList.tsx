import { forwardRef, useEffect, useState, type HTMLAttributes } from 'react';
import { CloseIcon, FileIcon } from '../../internal/icons';
import { formatFileSize, isImage, type Attachment } from './files';

export interface AttachmentListLabels {
  /** The list's accessible name. */
  attachments: string;
  /** The remove button of one file. */
  remove: (name: string) => string;
}

export const defaultAttachmentListLabels: AttachmentListLabels = {
  attachments: 'Attachments',
  remove: (name) => `Remove ${name}`,
};

export interface AttachmentListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  attachments: Attachment[];
  /** Shows a remove button on each file and calls this with its id. */
  onRemove?: (id: string) => void;
  /** Show a thumbnail for image files. Defaults to true. */
  showPreviews?: boolean;
  disabled?: boolean;
  labels?: Partial<AttachmentListLabels>;
}

/** An object URL for a file, released when the file changes or on unmount. */
function usePreviewUrl(file: File, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setUrl(null);
      return;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(created);
    };
  }, [file, enabled]);
  return url;
}

function AttachmentItem({
  attachment,
  onRemove,
  showPreviews,
  disabled,
  labels,
}: {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  showPreviews: boolean;
  disabled: boolean;
  labels: AttachmentListLabels;
}) {
  const preview = usePreviewUrl(attachment.file, showPreviews && isImage(attachment));
  return (
    <li className="axon-attachment">
      <span className="axon-attachment__thumb" aria-hidden="true">
        {preview ? <img src={preview} alt="" /> : <FileIcon />}
      </span>
      <span className="axon-attachment__text">
        <span className="axon-attachment__name">{attachment.name}</span>
        <span className="axon-attachment__size">{formatFileSize(attachment.size)}</span>
      </span>
      {onRemove ? (
        <button
          type="button"
          className="axon-attachment__remove"
          aria-label={labels.remove(attachment.name)}
          disabled={disabled}
          onClick={() => onRemove(attachment.id)}
        >
          <CloseIcon />
        </button>
      ) : null}
    </li>
  );
}

/**
 * Chips for the files attached to a message: a thumbnail (for images) or file icon, the name, the
 * size and an optional remove button. Renders nothing for an empty list.
 */
export const AttachmentList = forwardRef<HTMLUListElement, AttachmentListProps>(
  function AttachmentList(
    {
      attachments,
      onRemove,
      showPreviews = true,
      disabled = false,
      labels: labelsProp,
      className,
      ...rest
    },
    ref,
  ) {
    const labels = { ...defaultAttachmentListLabels, ...labelsProp };
    if (attachments.length === 0) return null;
    return (
      <ul
        {...rest}
        ref={ref}
        aria-label={labels.attachments}
        className={['axon-attachments', className].filter(Boolean).join(' ')}
      >
        {attachments.map((attachment) => (
          <AttachmentItem
            key={attachment.id}
            attachment={attachment}
            onRemove={onRemove}
            showPreviews={showPreviews}
            disabled={disabled}
            labels={labels}
          />
        ))}
      </ul>
    );
  },
);
