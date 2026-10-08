import { forwardRef, useId, useMemo, type ReactNode, type Ref } from 'react';
import { Chip, IconButton, Progress, type FileUploadProps } from '@axonui/core';
import {
  Form,
  FormActions,
  FormFileUpload,
  z,
  type FieldValues,
  type FormHelpers,
  type FormSubmitResult,
} from '@axonui/forms';
import { CloseIcon, FileIcon, RefreshIcon } from '../../internal/icons';
import { formatFileSize } from '../Attachments/files';

// ---------------------------------------------------------------------------------------------
// Types

export type KnowledgeDocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface KnowledgeDocument {
  id: string;
  name: string;
  /** Size in bytes. */
  size?: number;
  status: KnowledgeDocumentStatus;
  /** 0 to 100, shown while `status` is `uploading`. */
  progress?: number;
  /** Shown when `status` is `error`. */
  error?: string;
}

export interface KnowledgeDocumentCounts {
  total: number;
  uploading: number;
  processing: number;
  ready: number;
  failed: number;
}

/** What `KnowledgeUploadForm` submits: the files that were chosen. */
export interface KnowledgeUploadValues {
  files: File[];
}

// ---------------------------------------------------------------------------------------------
// Schema

export interface KnowledgeUploadMessages {
  filesRequired: string;
  tooManyFiles: (max: number) => string;
}

export const defaultKnowledgeUploadMessages: KnowledgeUploadMessages = {
  filesRequired: 'Choose at least one file to upload.',
  tooManyFiles: (max) => `Upload at most ${max} files at a time.`,
};

export interface KnowledgeUploadSchemaOptions {
  messages?: Partial<KnowledgeUploadMessages>;
  /** Most files per upload. Defaults to 10. */
  maxFiles?: number;
}

/** Builds the schema, for another limit or translated messages. */
export function createKnowledgeUploadSchema({
  messages,
  maxFiles = 10,
}: KnowledgeUploadSchemaOptions = {}) {
  const text = { ...defaultKnowledgeUploadMessages, ...messages };
  return z.object({
    files: z
      .array(z.custom<File>())
      .min(1, text.filesRequired)
      .max(maxFiles, text.tooManyFiles(maxFiles)),
  });
}

export const knowledgeUploadSchema = createKnowledgeUploadSchema();

// ---------------------------------------------------------------------------------------------
// Labels

export interface KnowledgeUploadLabels {
  files: string;
  filesHint: string;
  submit: string;
  documents: string;
  empty: string;
  summary: (counts: KnowledgeDocumentCounts) => string;
  status: Record<KnowledgeDocumentStatus, string>;
  uploadingName: (name: string) => string;
  processingName: (name: string) => string;
  remove: (name: string) => string;
  cancelUpload: (name: string) => string;
  retry: (name: string) => string;
  unknownError: string;
}

export const defaultKnowledgeUploadLabels: KnowledgeUploadLabels = {
  files: 'Add documents',
  filesHint: 'The assistant can use these to answer questions.',
  submit: 'Upload',
  documents: 'Documents',
  empty: 'No documents yet.',
  summary: ({ total, ready, failed }) =>
    `${ready} of ${total} ${total === 1 ? 'document' : 'documents'} ready${
      failed ? `, ${failed} failed` : ''
    }`,
  status: { uploading: 'Uploading', processing: 'Processing', ready: 'Ready', error: 'Failed' },
  uploadingName: (name) => `Uploading ${name}`,
  processingName: (name) => `Processing ${name}`,
  remove: (name) => `Remove ${name}`,
  cancelUpload: (name) => `Cancel upload of ${name}`,
  retry: (name) => `Try ${name} again`,
  unknownError: 'Something went wrong.',
};

/** Any of the labels; `status` may name just the statuses you want to change. */
export type KnowledgeUploadLabelOverrides = Partial<Omit<KnowledgeUploadLabels, 'status'>> & {
  status?: Partial<KnowledgeUploadLabels['status']>;
};

const statusColor = {
  uploading: 'primary',
  processing: 'warning',
  ready: 'success',
  error: 'danger',
} as const;

// ---------------------------------------------------------------------------------------------
// Component

export interface KnowledgeUploadFormProps {
  /** The documents already added, with where each one is: uploading, processing, ready or failed. */
  documents?: readonly KnowledgeDocument[];
  /** Called with the chosen files. Start the upload, then update `documents` as it goes. */
  onSubmit: (
    values: KnowledgeUploadValues,
    helpers: FormHelpers<FieldValues, KnowledgeUploadValues>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  /** Shows a remove button on each document ("Cancel upload" while it is uploading). */
  onRemoveDocument?: (document: KnowledgeDocument) => void;
  /** Shows a "Try again" button on a failed document. */
  onRetryDocument?: (document: KnowledgeDocument) => void;
  /** File types, as for `<input accept>`: `.pdf,.txt,.md`. */
  accept?: string;
  /** Largest allowed file, in bytes. */
  maxFileSize?: number;
  /** Most files per upload. Defaults to 10. */
  maxFiles?: number;
  /** Called with files the picker refused, and why. */
  onReject?: FileUploadProps['onReject'];
  /** Empties the picker after a successful upload. Defaults to true. */
  resetOnSuccess?: boolean;
  /** Replaces the schema. Start from `createKnowledgeUploadSchema()`. */
  schema?: z.ZodType<KnowledgeUploadValues, FieldValues>;
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  className?: string;
  labels?: KnowledgeUploadLabelOverrides;
}

function countDocuments(documents: readonly KnowledgeDocument[]): KnowledgeDocumentCounts {
  const counts = { total: documents.length, uploading: 0, processing: 0, ready: 0, failed: 0 };
  for (const document of documents) {
    if (document.status === 'error') counts.failed += 1;
    else counts[document.status] += 1;
  }
  return counts;
}

function DocumentItem({
  document,
  labels,
  onRemove,
  onRetry,
}: {
  document: KnowledgeDocument;
  labels: KnowledgeUploadLabels;
  onRemove?: (document: KnowledgeDocument) => void;
  onRetry?: (document: KnowledgeDocument) => void;
}) {
  const { name, size, status, progress, error } = document;
  return (
    <li className="axon-knowledge__item" data-status={status}>
      <FileIcon className="axon-knowledge__icon" aria-hidden="true" />
      <div className="axon-knowledge__details">
        <div className="axon-knowledge__row">
          <span className="axon-knowledge__name">{name}</span>
          {size !== undefined ? (
            <span className="axon-knowledge__size">{formatFileSize(size)}</span>
          ) : null}
          <Chip size="sm" variant="subtle" color={statusColor[status]}>
            {labels.status[status]}
          </Chip>
        </div>
        {status === 'uploading' ? (
          <Progress size="sm" value={progress ?? null} aria-label={labels.uploadingName(name)} />
        ) : null}
        {status === 'processing' ? (
          <Progress size="sm" aria-label={labels.processingName(name)} />
        ) : null}
        {status === 'error' ? (
          <p className="axon-knowledge__error">{error ?? labels.unknownError}</p>
        ) : null}
      </div>
      <div className="axon-knowledge__actions">
        {status === 'error' && onRetry ? (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={labels.retry(name)}
            title={labels.retry(name)}
            onClick={() => onRetry(document)}
          >
            <RefreshIcon />
          </IconButton>
        ) : null}
        {onRemove ? (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={status === 'uploading' ? labels.cancelUpload(name) : labels.remove(name)}
            title={status === 'uploading' ? labels.cancelUpload(name) : labels.remove(name)}
            onClick={() => onRemove(document)}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}

/**
 * A form for adding documents the assistant can draw on: a file picker with limits, and a list of
 * the documents so far, each with its status (uploading with progress, processing, ready or
 * failed), a remove button and a retry. It uploads nothing itself: `onSubmit` receives the files,
 * and you keep `documents` up to date.
 */
export const KnowledgeUploadForm = forwardRef(function KnowledgeUploadForm(
  {
    documents,
    onSubmit,
    onRemoveDocument,
    onRetryDocument,
    accept,
    maxFileSize,
    maxFiles = 10,
    onReject,
    resetOnSuccess = true,
    schema,
    disabled,
    error,
    className,
    labels: labelsProp,
  }: KnowledgeUploadFormProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = {
    ...defaultKnowledgeUploadLabels,
    ...labelsProp,
    status: { ...defaultKnowledgeUploadLabels.status, ...labelsProp?.status },
  };
  const headingId = useId();
  const defaultSchema = useMemo(
    () =>
      createKnowledgeUploadSchema({ maxFiles }) as unknown as z.ZodType<
        KnowledgeUploadValues,
        FieldValues
      >,
    [maxFiles],
  );
  const counts = documents ? countDocuments(documents) : null;

  return (
    <div className={['axon-knowledge', className].filter(Boolean).join(' ')}>
      <Form<FieldValues, KnowledgeUploadValues>
        ref={ref}
        schema={schema ?? defaultSchema}
        defaultValues={{ files: [] }}
        onSubmit={onSubmit}
        resetOnSuccess={resetOnSuccess}
        formError={error}
        disabled={disabled}
      >
        <FormFileUpload
          name="files"
          label={labels.files}
          hint={labels.filesHint}
          accept={accept}
          maxSize={maxFileSize}
          maxFiles={maxFiles}
          onReject={onReject}
          multiple
          fullWidth
        />
        <FormActions submitLabel={labels.submit} align="start" />
      </Form>

      {documents && counts ? (
        <section aria-labelledby={headingId} className="axon-knowledge__list">
          <div className="axon-knowledge__list-header">
            <h3 id={headingId} className="axon-knowledge__list-title">
              {labels.documents}
            </h3>
            {documents.length ? (
              <span role="status" className="axon-knowledge__summary">
                {labels.summary(counts)}
              </span>
            ) : null}
          </div>
          {documents.length ? (
            <ul className="axon-knowledge__items">
              {documents.map((document) => (
                <DocumentItem
                  key={document.id}
                  document={document}
                  labels={labels}
                  onRemove={onRemoveDocument}
                  onRetry={onRetryDocument}
                />
              ))}
            </ul>
          ) : (
            <p className="axon-knowledge__empty">{labels.empty}</p>
          )}
        </section>
      ) : null}
    </div>
  );
});
