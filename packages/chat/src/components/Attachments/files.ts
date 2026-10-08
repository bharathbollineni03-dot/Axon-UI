export interface Attachment {
  /** Unique within the composer. */
  id: string;
  file: File;
  name: string;
  /** Bytes. */
  size: number;
  /** MIME type, possibly empty. */
  type: string;
}

export type AttachmentRejectionReason = 'type' | 'size' | 'count';

export interface AttachmentRejection {
  file: File;
  reason: AttachmentRejectionReason;
}

export interface FileRules {
  /** The same format as the `accept` attribute: `image/*,.pdf,text/plain`. */
  accept?: string;
  /** Largest file, in bytes. */
  maxFileSize?: number;
  /** Most files in total. */
  maxFiles?: number;
}

let counter = 0;
export const createAttachmentId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `att-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const toAttachment = (file: File): Attachment => ({
  id: createAttachmentId(),
  file,
  name: file.name,
  size: file.size,
  type: file.type,
});

/** Whether a file matches an `accept` list: wildcards (`image/*`), exact types and extensions. */
export function matchesAccept(
  file: Pick<File, 'name' | 'type'>,
  accept: string | undefined,
): boolean {
  if (!accept) return true;
  const rules = accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

/**
 * Splits `incoming` files into those that may be added and those that may not, given the rules
 * and how many files are already attached. Files are judged in order, so `maxFiles` keeps the
 * first ones.
 */
export function validateFiles(
  incoming: File[],
  rules: FileRules,
  alreadyAttached = 0,
): { accepted: File[]; rejected: AttachmentRejection[] } {
  const accepted: File[] = [];
  const rejected: AttachmentRejection[] = [];
  for (const file of incoming) {
    if (!matchesAccept(file, rules.accept)) {
      rejected.push({ file, reason: 'type' });
    } else if (rules.maxFileSize !== undefined && file.size > rules.maxFileSize) {
      rejected.push({ file, reason: 'size' });
    } else if (
      rules.maxFiles !== undefined &&
      alreadyAttached + accepted.length >= rules.maxFiles
    ) {
      rejected.push({ file, reason: 'count' });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Number((bytes / 1024).toFixed(1))} KB`;
  return `${bytes} B`;
}

export const isImage = (attachment: Pick<Attachment, 'type'>) =>
  attachment.type.startsWith('image/');
