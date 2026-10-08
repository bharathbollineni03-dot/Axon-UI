import {
  useController,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import { useFormStatus } from '../Form/FormStatus';

/** Props every form binding shares. */
export interface FormControlProps {
  /** The field's name in the form values. Nested fields use dots: `"address.city"`. */
  name: string;
  /** Only needed when the control is outside a `Form` or a react-hook-form `FormProvider`. */
  control?: Control<FieldValues>;
  /** The value the field starts with when the form's `defaultValues` has none for it. */
  defaultValue?: unknown;
  /** Removes the field's value from the form when the field unmounts. */
  shouldUnregister?: boolean;
}

export interface UseFormFieldResult {
  /** The react-hook-form field: `value`, `onChange`, `onBlur`, `ref` and `name`. */
  field: ControllerRenderProps<FieldValues, string>;
  fieldState: ControllerFieldState;
  /** Whether to show the field in its error state. */
  invalid: boolean;
  /** The message of the field's error, if any. */
  errorMessage: string | undefined;
  /** True when the field's own `disabled` prop is set or the whole form is disabled. */
  disabled: boolean;
}

/**
 * Connects one field to the surrounding form. The bindings (`FormTextField` and friends) use it,
 * and you can use it to connect an input of your own.
 */
export function useFormField(
  { name, control, defaultValue, shouldUnregister }: FormControlProps,
  disabledProp?: boolean,
): UseFormFieldResult {
  const { disabled: formDisabled } = useFormStatus();
  const { field, fieldState } = useController<FieldValues, string>({
    name,
    control,
    defaultValue,
    shouldUnregister,
  });
  return {
    field,
    fieldState,
    invalid: fieldState.invalid,
    errorMessage: fieldState.error?.message,
    disabled: Boolean(disabledProp) || formDisabled,
  };
}
