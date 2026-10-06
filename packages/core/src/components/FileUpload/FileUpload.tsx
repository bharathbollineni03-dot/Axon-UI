import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { useControllableState } from '../../hooks/useControllableState';
import { CloseIcon, UploadIcon } from '../../internal/icons';
import { Field, useFieldIds } from '../../internal/Field/Field';
import { formatBytes, getFileKey, matchesAccept } from '../../internal/files';

export { getFileKey } from '../../internal/files';

export type FileRejectionReason = 'type' | 'size' | 'count';

export interface FileRejection {
  file: File;
  reasons: FileRejectionReason[];
}

export interface FileUploadState {
  status?: 'uploading' | 'done' | 'error';
  /** 0 to 100, shown while `status` is `uploading`. */
  progress?: number;
  /** Shown instead of the size when `status` is `error`. */
  error?: string;
}

/**
 * `className` and `style` apply to the outer wrapper and `ref` points at the file `<input>`.
 * The component never uploads anything: it collects files and shows the progress you give it.
 */
export interface FileUploadProps {
  /** The accepted files. */
  value?: File[];
  defaultValue?: File[];
  onChange?: (files: File[]) => void;
  /** Called with the files that were refused and why. */
  onReject?: (rejections: FileRejection[]) => void;
  /** File types, as for `<input accept>`: `image/*,.pdf`. */
  accept?: string;
  /** Largest allowed file, in bytes. */
  maxSize?: number;
  /** Most files allowed in the list (ignored when `multiple` is false). */
  maxFiles?: number;
  /** Allow several files. Defaults to `true`; a single-file field replaces its file. */
  multiple?: boolean;
  /** Upload progress and status per file, keyed by `getFileKey(file)`. */
  uploads?: Record<string, FileUploadState>;
  label?: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  /** Shown in place of `helperText` while `error` is set. */
  errorMessage?: ReactNode;
  size?: AxonSize;
  color?: AxonColor;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Names the file input so the files are submitted with a surrounding `<form>`. */
  name?: string;
  id?: string;
  /** Replaces the generated "PNG, JPG up to 2 MB" line inside the zone. */
  hint?: ReactNode;
  /** Locale for file sizes. Defaults to `en-US`. */
  locale?: string;
  dropLabel?: string;
  browseLabel?: string;
  removeLabel?: (file: File) => string;
  /** Message for a refused file, e.g. for translation. */
  getRejectionMessage?: (
    rejection: FileRejection,
    limits: { maxSize?: number; maxFiles?: number },
  ) => string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
  style?: CSSProperties;
}

const EMPTY: File[] = [];
const NO_UPLOADS: Record<string, FileUploadState> = {};

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  {
    value: valueProp,
    defaultValue = EMPTY,
    onChange,
    onReject,
    accept,
    maxSize,
    maxFiles,
    multiple = true,
    uploads = NO_UPLOADS,
    label,
    helperText,
    error = false,
    errorMessage,
    size = 'md',
    color = 'primary',
    fullWidth = false,
    disabled = false,
    required = false,
    name,
    id: idProp,
    hint,
    locale = 'en-US',
    dropLabel = 'Drag and drop files here, or',
    browseLabel = 'browse',
    removeLabel = (file) => `Remove ${file.name}`,
    getRejectionMessage,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className,
    style,
  },
  ref,
) {
  const { id, messageId, counterId } = useFieldIds(idProp);
  const hintId = `${id}-hint`;
  const rejectionsId = `${id}-rejections`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(ref, inputRef);

  const [files, setFiles] = useControllableState<File[]>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // Keep the native input's files in step so a named input submits them with its form.
  useEffect(() => {
    const input = inputRef.current;
    if (!name || !input || typeof DataTransfer === 'undefined') return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  }, [files, name]);

  const defaultMessage = (rejection: FileRejection) => {
    const parts = rejection.reasons.map((reason) =>
      reason === 'type'
        ? 'File type not allowed'
        : reason === 'size'
          ? `File is larger than ${formatBytes(maxSize ?? 0, locale)}`
          : `Too many files (maximum ${maxFiles})`,
    );
    return `${rejection.file.name}: ${parts.join('; ')}`;
  };

  const addFiles = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    const known = new Set(files.map(getFileKey));
    const candidates = incoming.filter((file) => {
      const key = getFileKey(file);
      if (known.has(key)) return false; // already in the list
      known.add(key);
      return true;
    });
    const nextRejections: FileRejection[] = [];
    const accepted: File[] = [];
    for (const file of candidates) {
      const reasons: FileRejectionReason[] = [];
      if (!matchesAccept(file, accept)) reasons.push('type');
      if (maxSize !== undefined && file.size > maxSize) reasons.push('size');
      if (reasons.length > 0) nextRejections.push({ file, reasons });
      else accepted.push(file);
    }

    let next: File[];
    if (!multiple) {
      next = accepted.length > 0 ? [accepted[0]!] : files;
      accepted.slice(1).forEach((file) => nextRejections.push({ file, reasons: ['count'] }));
    } else {
      const room = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - files.length);
      accepted.slice(room).forEach((file) => nextRejections.push({ file, reasons: ['count'] }));
      next = [...files, ...accepted.slice(0, room)];
    }

    setRejections(nextRejections);
    if (nextRejections.length > 0) onReject?.(nextRejections);
    if (next !== files && (next.length !== files.length || next.some((f, i) => f !== files[i]))) {
      setFiles(next);
    }
  };

  const remove = (file: File) => {
    setRejections([]);
    setFiles(files.filter((f) => f !== file));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    // Allow choosing the same file again after removing it.
    if (!name) event.target.value = '';
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };
  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // stops the browser from also loading the file into the input
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  const limits = { maxSize, maxFiles };
  const constraintText =
    hint ??
    ([
      accept
        ? accept
            .split(',')
            .map((t) => t.trim().replace(/^\./, '').toUpperCase())
            .join(', ')
        : null,
      maxSize !== undefined ? `up to ${formatBytes(maxSize, locale)}` : null,
      multiple && maxFiles !== undefined ? `max ${maxFiles} files` : null,
    ]
      .filter(Boolean)
      .join(' · ') ||
      null);

  const message = error && errorMessage ? errorMessage : helperText;

  return (
    <Field
      baseClass="axon-file-upload"
      id={id}
      messageId={messageId}
      counterId={counterId}
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      fullWidth={fullWidth}
      message={message}
      className={cx(`axon-file-upload--${size}`, `axon-file-upload--${color}`, className)}
      style={style}
    >
      {/* Drag-and-drop is a pointer enhancement; the input inside the zone is the keyboard path. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={cx(
          'axon-file-upload__zone',
          dragging && 'axon-file-upload__zone--dragging',
          disabled && 'axon-file-upload__zone--disabled',
          error && 'axon-file-upload__zone--error',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={mergedRef}
          id={id}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required && files.length === 0}
          aria-label={label ? undefined : (ariaLabel ?? 'Upload files')}
          aria-invalid={error || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            Boolean(constraintText) && hintId,
            rejections.length > 0 && rejectionsId,
            Boolean(message) && messageId,
          )}
          className="axon-file-upload__input"
          onChange={handleInputChange}
        />
        <span className="axon-file-upload__icon" aria-hidden="true">
          <UploadIcon />
        </span>
        <span className="axon-file-upload__prompt" aria-hidden="true">
          {dropLabel} <span className="axon-file-upload__browse">{browseLabel}</span>
        </span>
        {constraintText ? (
          <span id={hintId} className="axon-file-upload__hint">
            {constraintText}
          </span>
        ) : null}
      </div>
      <div
        id={rejectionsId}
        className="axon-file-upload__rejections"
        role="status"
        aria-live="polite"
      >
        {rejections.length > 0 ? (
          <ul>
            {rejections.map((rejection) => (
              <li key={getFileKey(rejection.file)}>
                {(getRejectionMessage ?? defaultMessage)(rejection, limits)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {files.length > 0 ? (
        <ul className="axon-file-upload__list" aria-label="Selected files">
          {files.map((file) => {
            const state = uploads[getFileKey(file)] ?? {};
            return (
              <li
                key={getFileKey(file)}
                className={cx(
                  'axon-file-upload__item',
                  state.status === 'error' && 'axon-file-upload__item--error',
                )}
              >
                <span className="axon-file-upload__file-text">
                  <span className="axon-file-upload__file-name">{file.name}</span>
                  <span className="axon-file-upload__file-meta">
                    {state.status === 'error' && state.error
                      ? state.error
                      : state.status === 'done'
                        ? `${formatBytes(file.size, locale)} · Uploaded`
                        : formatBytes(file.size, locale)}
                  </span>
                  {state.status === 'uploading' ? (
                    <span
                      role="progressbar"
                      aria-label={`Uploading ${file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(state.progress ?? 0)}
                      className="axon-file-upload__progress"
                    >
                      <span
                        className="axon-file-upload__progress-bar"
                        style={{ width: `${Math.min(100, Math.max(0, state.progress ?? 0))}%` }}
                      />
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="axon-input__action"
                  aria-label={removeLabel(file)}
                  disabled={disabled}
                  onClick={() => remove(file)}
                >
                  <CloseIcon />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Field>
  );
});
