import { createContext, useContext, type ReactNode } from 'react';

export interface FormStatus {
  /** True from the moment a valid form is submitted until `onSubmit` settles. */
  isSubmitting: boolean;
  /** The message shown in the form's error banner, or `null`. */
  formError: ReactNode;
  /** Shows (or, with `null`, clears) the form's error banner. */
  setFormError: (error: ReactNode) => void;
  /** Whether the whole form is disabled. */
  disabled: boolean;
}

export const FormStatusContext = createContext<FormStatus | null>(null);

const outsideAForm: FormStatus = {
  isSubmitting: false,
  formError: null,
  setFormError: () => {},
  disabled: false,
};

/**
 * The submit state of the nearest `Form`. Outside a `Form` (for example inside a plain
 * react-hook-form `FormProvider`) it reports "idle", so form parts work there too.
 */
export function useFormStatus(): FormStatus {
  return useContext(FormStatusContext) ?? outsideAForm;
}
