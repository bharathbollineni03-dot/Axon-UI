import type { ReactNode } from 'react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useFormField, type FormControlProps } from './useFormField';

/** What `FormField` hands to `render`: spread it onto an input. */
export interface FormFieldInputProps {
  name: string;
  /** The field's current value. It is `undefined` until the form or the user sets one. */
  value: unknown;
  /**
   * Call it with the new value, or with a change event. For an event it reads `target.value`, or
   * `target.checked` for a checkbox.
   */
  onChange: (...event: unknown[]) => void;
  onBlur: () => void;
  /** Lets the form focus this input when it is the first one with an error. */
  ref: ControllerRenderProps<FieldValues, string>['ref'];
  label?: ReactNode;
  helperText?: ReactNode;
  /** Whether the field is in its error state. */
  error: boolean;
  errorMessage?: ReactNode;
  required?: boolean;
  disabled: boolean;
}

export interface FormFieldState {
  invalid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  errorMessage: string | undefined;
}

export interface FormFieldProps extends FormControlProps {
  label?: ReactNode;
  helperText?: ReactNode;
  /** Shows the required marker. Whether the field is actually required is up to your schema. */
  required?: boolean;
  disabled?: boolean;
  /** Renders the input. Spread `props` onto an `@axonui/core` input, or map it by hand. */
  render: (props: FormFieldInputProps, state: FormFieldState) => ReactNode;
}

/**
 * Wires any input to the form: its value, change and blur handling, label, helper text, error
 * message, required marker and `aria-invalid`. Use the prebuilt bindings (`FormTextField` and the
 * rest) for the `@axonui/core` inputs, and `FormField` for anything else.
 *
 * ```tsx
 * <FormField name="email" label="Email" required render={(props) => (
 *   <TextField {...props} type="email" value={String(props.value ?? '')} />
 * )} />
 * ```
 */
export function FormField({
  label,
  helperText,
  required,
  disabled: disabledProp,
  render,
  ...control
}: FormFieldProps) {
  const { field, fieldState, invalid, errorMessage, disabled } = useFormField(
    control,
    disabledProp,
  );
  return (
    <>
      {render(
        {
          name: field.name,
          value: field.value,
          onChange: field.onChange,
          onBlur: field.onBlur,
          ref: field.ref,
          label,
          helperText,
          error: invalid,
          errorMessage,
          required,
          disabled,
        },
        {
          invalid,
          isTouched: fieldState.isTouched,
          isDirty: fieldState.isDirty,
          errorMessage,
        },
      )}
    </>
  );
}
