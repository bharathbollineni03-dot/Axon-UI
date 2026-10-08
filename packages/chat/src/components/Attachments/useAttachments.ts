import { useCallback, useRef, useState } from 'react';
import { useControllableState } from '@axon/core';
import {
  toAttachment,
  validateFiles,
  type Attachment,
  type AttachmentRejection,
  type FileRules,
} from './files';

export interface UseAttachmentsOptions extends FileRules {
  /** The attachments. Controlled; pair with `onChange`. */
  value?: Attachment[];
  defaultValue?: Attachment[];
  onChange?: (attachments: Attachment[]) => void;
  /** Called with the files that were turned away, and why. */
  onReject?: (rejections: AttachmentRejection[]) => void;
}

export interface UseAttachmentsReturn {
  attachments: Attachment[];
  /** Adds files that pass the rules; the others are reported through `onReject` and `rejections`. */
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** The files turned away by the last `add`, until the next one. */
  rejections: AttachmentRejection[];
  clearRejections: () => void;
}

/**
 * The files attached to a message: add (with type, size and count rules), remove and clear. Works
 * controlled or uncontrolled.
 */
export function useAttachments({
  value,
  defaultValue,
  onChange,
  onReject,
  accept,
  maxFileSize,
  maxFiles,
}: UseAttachmentsOptions = {}): UseAttachmentsReturn {
  const [attachments, setAttachments] = useControllableState<Attachment[]>({
    value,
    defaultValue: defaultValue ?? [],
    onChange,
  });
  const [rejections, setRejections] = useState<AttachmentRejection[]>([]);
  // Reading the list through a ref lets two quick adds (a multi-file drop) see each other.
  const latest = useRef(attachments);
  latest.current = attachments;

  const add = useCallback<UseAttachmentsReturn['add']>(
    (input) => {
      const files = Array.from(input);
      if (files.length === 0) return;
      const { accepted, rejected } = validateFiles(
        files,
        { accept, maxFileSize, maxFiles },
        latest.current.length,
      );
      setRejections(rejected);
      if (rejected.length > 0) onReject?.(rejected);
      if (accepted.length > 0) {
        const next = [...latest.current, ...accepted.map(toAttachment)];
        latest.current = next;
        setAttachments(next);
      }
    },
    [accept, maxFileSize, maxFiles, onReject, setAttachments],
  );

  const remove = useCallback<UseAttachmentsReturn['remove']>(
    (id) => {
      const next = latest.current.filter((attachment) => attachment.id !== id);
      latest.current = next;
      setAttachments(next);
    },
    [setAttachments],
  );

  const clear = useCallback(() => {
    latest.current = [];
    setAttachments([]);
  }, [setAttachments]);

  const clearRejections = useCallback(() => setRejections([]), []);

  return { attachments, add, remove, clear, rejections, clearRejections };
}
