import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * Errors from your server (or any other place the form cannot know about) to show on the form.
 * Return it from `onSubmit`, or throw a `FormSubmitError` that carries it.
 */
export interface FormSubmitErrors {
  /** A message for the whole form, shown in the error banner above the fields. */
  formError?: string;
  /** A message per field. Nested fields use dots (`"address.street"`). */
  fieldErrors?: Record<string, string | string[] | undefined>;
}

/** What `onSubmit` may return: nothing when it worked, or the errors to show. */
export type FormSubmitResult = FormSubmitErrors | undefined | null | void;

/** Throw this from `onSubmit` to put field errors and/or a form error on the form. */
export class FormSubmitError extends Error {
  readonly formError?: string;
  readonly fieldErrors?: FormSubmitErrors['fieldErrors'];

  constructor(errors: FormSubmitErrors | string) {
    const details = typeof errors === 'string' ? { formError: errors } : errors;
    super(details.formError ?? 'The form could not be submitted.');
    this.name = 'FormSubmitError';
    this.formError = details.formError;
    this.fieldErrors = details.fieldErrors;
  }
}

/** Whether a value looks like `FormSubmitErrors` (an object with a form or field errors). */
export function isSubmitErrors(value: unknown): value is FormSubmitErrors {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as FormSubmitErrors;
  return candidate.formError !== undefined || candidate.fieldErrors !== undefined;
}

/**
 * Puts `fieldErrors` on the matching fields with `setError` and focuses the first one. Returns
 * whether there was at least one field error.
 */
export function applyFieldErrors<TInput extends FieldValues, TOutput extends FieldValues>(
  form: Pick<UseFormReturn<TInput, unknown, TOutput>, 'setError'>,
  fieldErrors: FormSubmitErrors['fieldErrors'],
): boolean {
  let first = true;
  for (const [name, value] of Object.entries(fieldErrors ?? {})) {
    const message = Array.isArray(value) ? value[0] : value;
    if (!message) continue;
    form.setError(name as never, { type: 'server', message }, { shouldFocus: first });
    first = false;
  }
  return !first;
}
