import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useFormState } from 'react-hook-form';
import { Button, type AxonColor, type AxonSize } from '@axon/core';
import { useFormStatus } from '../Form/FormStatus';

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** Text of the submit button. Defaults to "Submit". */
  submitLabel?: ReactNode;
  /** Text of the cancel button, which shows when `onCancel` is set. Defaults to "Cancel". */
  cancelLabel?: ReactNode;
  /** Shows a Cancel button that calls this. */
  onCancel?: () => void;
  /** Where the buttons sit: `end` (default), `start`, `between` (cancel left, submit right) or `stretch` (full-width, stacked). */
  align?: 'start' | 'end' | 'between' | 'stretch';
  size?: AxonSize;
  /** Color of the submit button. */
  color?: AxonColor;
  /** Disables the submit button until the user has changed something. */
  disableWhenPristine?: boolean;
  /** Disables the submit button while the form has validation errors. Validates as the user types. */
  disableWhenInvalid?: boolean;
  /** Disables the submit button for your own reasons. */
  submitDisabled?: boolean;
  /** Extra buttons, placed before Cancel. */
  children?: ReactNode;
}

/**
 * The row of buttons under a form: an optional Cancel and the submit button, which shows a
 * spinner and ignores clicks while the form is submitting. Must be inside a `Form`.
 */
export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  {
    submitLabel = 'Submit',
    cancelLabel = 'Cancel',
    onCancel,
    align = 'end',
    size,
    color,
    disableWhenPristine = false,
    disableWhenInvalid = false,
    submitDisabled = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const { isSubmitting, disabled: formDisabled } = useFormStatus();
  const formState = useFormState();
  // Reading a property is what subscribes to it, so only the ones asked for are read.
  const pristine = disableWhenPristine && !formState.isDirty;
  const invalid = disableWhenInvalid && !formState.isValid;

  return (
    <div
      {...rest}
      ref={ref}
      className={['axon-form-actions', `axon-form-actions--${align}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size={size}
          fullWidth={align === 'stretch'}
          disabled={isSubmitting || formDisabled}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
      <Button
        type="submit"
        size={size}
        color={color}
        fullWidth={align === 'stretch'}
        loading={isSubmitting}
        disabled={formDisabled || submitDisabled || pristine || invalid}
      >
        {submitLabel}
      </Button>
    </div>
  );
});
