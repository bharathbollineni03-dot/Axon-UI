import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, Button, useId, type AvatarSize } from '@axon/core';
import { useMergedRef } from '../../internal/mergeRefs';
import { useFormField, type FormControlProps } from '../FormField/useFormField';

export interface FormAvatarUploadProps extends FormControlProps {
  /** The group's visible label. Defaults to "Profile photo". */
  label?: ReactNode;
  /** The current picture, shown until the user picks a new one. */
  src?: string;
  /** Used for the initials when there is no picture. */
  fallbackName?: string;
  /** Text of the button that opens the file chooser. Defaults to "Change photo". */
  changeLabel?: string;
  /** Text of the button that drops a newly chosen picture. Defaults to "Undo". */
  undoLabel?: string;
  /** Text of the button for `onRemoveCurrent`. Defaults to "Remove photo". */
  removeLabel?: string;
  /** Called by the "Remove photo" button, which shows while there is a current `src`. */
  onRemoveCurrent?: () => void;
  /** Which files the chooser offers. Defaults to images. */
  accept?: string;
  helperText?: ReactNode;
  size?: AvatarSize;
  disabled?: boolean;
  className?: string;
}

/** An object URL for a file, for previews. It is released when the file changes or on unmount. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setUrl(null);
      return;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(created);
    };
  }, [file]);
  return url;
}

/**
 * A picture field: an avatar preview with "Change photo" and "Undo" buttons. The form value is
 * the chosen `File`, or `null`. The picture is previewed locally and nothing is uploaded: your
 * `onSubmit` receives the file and sends it wherever it belongs.
 */
export const FormAvatarUpload = forwardRef<HTMLButtonElement, FormAvatarUploadProps>(
  function FormAvatarUpload(
    {
      name,
      control,
      defaultValue,
      shouldUnregister,
      label = 'Profile photo',
      src,
      fallbackName,
      changeLabel = 'Change photo',
      undoLabel = 'Undo',
      removeLabel = 'Remove photo',
      onRemoveCurrent,
      accept = 'image/*',
      helperText,
      size = 'xl',
      disabled,
      className,
    },
    ref,
  ) {
    const {
      field,
      invalid,
      errorMessage,
      disabled: isDisabled,
    } = useFormField(
      { name, control, defaultValue: defaultValue ?? null, shouldUnregister },
      disabled,
    );
    const file = (field.value as File | null | undefined) ?? null;
    const preview = useObjectUrl(file);
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useMergedRef<HTMLButtonElement>(ref, field.ref);

    const baseId = useId(undefined, 'axon-avatar-upload');
    const labelId = `${baseId}-label`;
    const messageId = `${baseId}-message`;
    const message = invalid && errorMessage ? errorMessage : helperText;

    return (
      <div
        role="group"
        aria-labelledby={labelId}
        className={['axon-avatar-upload', invalid && 'axon-avatar-upload--error', className]
          .filter(Boolean)
          .join(' ')}
      >
        <span id={labelId} className="axon-avatar-upload__label">
          {label}
        </span>
        <div className="axon-avatar-upload__row">
          <Avatar src={preview ?? src} name={fallbackName} size={size} />
          <div className="axon-avatar-upload__actions">
            <Button
              ref={buttonRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              aria-describedby={message ? messageId : undefined}
              onClick={() => inputRef.current?.click()}
            >
              {changeLabel}
            </Button>
            {file ? (
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="sm"
                disabled={isDisabled}
                onClick={() => field.onChange(null)}
              >
                {undoLabel}
              </Button>
            ) : onRemoveCurrent && src ? (
              <Button
                type="button"
                variant="ghost"
                color="danger"
                size="sm"
                disabled={isDisabled}
                onClick={onRemoveCurrent}
              >
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </div>
        {/* The Change button is the control. The native input stays out of the way. */}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          name={field.name}
          onChange={(event) => {
            field.onChange(event.target.files?.[0] ?? null);
            field.onBlur();
            // Picking the same file again must still count as a change.
            event.target.value = '';
          }}
        />
        {message ? (
          <p
            id={messageId}
            className={[
              'axon-avatar-upload__message',
              invalid && errorMessage && 'axon-avatar-upload__message--error',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {message}
          </p>
        ) : null}
      </div>
    );
  },
);
