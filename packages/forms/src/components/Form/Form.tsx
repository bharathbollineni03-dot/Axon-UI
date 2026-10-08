import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '@axon/core';
import { createResolver, type FormValidator } from '../../internal/resolver';
import {
  applyFieldErrors,
  FormSubmitError,
  isSubmitErrors,
  type FormSubmitErrors,
  type FormSubmitResult,
} from '../../internal/serverErrors';
import { FormStatusContext } from './FormStatus';

export type FormMode = 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';

/** Passed to `onSubmit` for putting errors on the form from the outside. */
export interface FormHelpers<TInput extends FieldValues, TOutput extends FieldValues = TInput> {
  /** The react-hook-form instance behind the form. */
  form: UseFormReturn<TInput, unknown, TOutput>;
  /** Puts a message on one field, as a server error, and focuses the first such field. */
  setError: (name: string, message: string) => void;
  /** Shows a message in the form's error banner. */
  setFormError: (message: ReactNode) => void;
  /** Resets the form to `values`, or to its default values. */
  reset: (values?: TInput) => void;
}

export interface FormProps<
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
> extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children' | 'onInvalid'> {
  /** A zod schema. Its output type is what `onSubmit` receives. */
  schema?: z.ZodType<TOutput, TInput>;
  /** A custom validator, used alone or after the schema. See `FormValidator`. */
  validate?: FormValidator<TOutput>;
  defaultValues?: DefaultValues<TInput>;
  /** Called with the validated values. May be async; the form is "submitting" until it settles. */
  onSubmit: (
    values: TOutput,
    helpers: FormHelpers<TInput, TOutput>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  /**
   * Runs when the form is submitted, before validation. Return `true` to handle the submission
   * yourself: validation and `onSubmit` are then skipped. `FormWizard` uses it to turn Enter into
   * "next step".
   */
  beforeSubmit?: (event: FormEvent<HTMLFormElement>) => boolean | void;
  /** Called when submitting fails validation, with the errors. */
  onInvalid?: (errors: FieldErrors<TInput>) => void;
  /** Called when `onSubmit` throws something that is not a `FormSubmitError`. */
  onSubmitError?: (error: unknown) => void;
  /** When validation runs first. `onTouched` (the default) is on blur, then on every change. */
  mode?: FormMode;
  /** When validation runs again after a submit. Defaults to `onChange`. */
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange';
  /** Use your own `useForm` instance. `schema`, `validate`, `defaultValues` and `mode` are then yours to set. */
  form?: UseFormReturn<TInput, unknown, TOutput>;
  /** A message for the error banner that you control. It takes the place of the submit error. */
  formError?: ReactNode;
  /** The banner text when `onSubmit` throws an error with no message. */
  fallbackErrorMessage?: string;
  /** Resets the form to its default values after a submit that reported no errors. */
  resetOnSuccess?: boolean;
  /** Disables every field and the submit button. */
  disabled?: boolean;
  children?: ReactNode | ((form: UseFormReturn<TInput, unknown, TOutput>) => ReactNode);
}

export type UseAxonFormOptions<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
> = Pick<
  FormProps<TInput, TOutput>,
  'schema' | 'validate' | 'defaultValues' | 'mode' | 'reValidateMode'
>;

/**
 * The react-hook-form instance behind `Form`: validation from a zod `schema` and/or a custom
 * `validate` function, and `onTouched` validation by default. Use it when something outside the
 * `<form>` needs the form, then pass the result to `Form` as `form`.
 */
export function useAxonForm<TInput extends FieldValues, TOutput extends FieldValues = TInput>({
  schema,
  validate,
  defaultValues,
  mode = 'onTouched',
  reValidateMode = 'onChange',
}: UseAxonFormOptions<TInput, TOutput>): UseFormReturn<TInput, unknown, TOutput> {
  const resolver = useMemo(() => createResolver(schema, validate), [schema, validate]);
  return useForm<TInput, unknown, TOutput>({ defaultValues, mode, reValidateMode, resolver });
}

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

function FormInner<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  props: FormProps<TInput, TOutput>,
  ref: Ref<HTMLFormElement>,
) {
  const {
    schema,
    validate,
    defaultValues,
    onSubmit,
    onInvalid,
    onSubmitError,
    beforeSubmit,
    mode = 'onTouched',
    reValidateMode = 'onChange',
    form: formProp,
    formError: formErrorProp,
    fallbackErrorMessage = 'Something went wrong. Please try again.',
    resetOnSuccess = false,
    disabled = false,
    className,
    children,
    ...rest
  } = props;

  const ownForm = useAxonForm<TInput, TOutput>({
    schema,
    validate,
    defaultValues,
    mode,
    reValidateMode,
  });
  const form = formProp ?? ownForm;

  const [submitError, setSubmitError] = useState<ReactNode>(null);
  const formError = formErrorProp ?? submitError;
  const { isSubmitting } = form.formState;

  const showErrors = useCallback(
    (errors: FormSubmitErrors) => {
      applyFieldErrors(form, errors.fieldErrors);
      if (errors.formError) setSubmitError(errors.formError);
    },
    [form],
  );

  const helpers = useMemo<FormHelpers<TInput, TOutput>>(
    () => ({
      form,
      setError: (name, message) =>
        form.setError(name as never, { type: 'server', message }, { shouldFocus: true }),
      setFormError: setSubmitError,
      reset: (values) => form.reset(values),
    }),
    [form],
  );

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await onSubmit(values, helpers);
      if (isSubmitErrors(result)) showErrors(result);
      else if (resetOnSuccess) form.reset();
    } catch (error) {
      if (error instanceof FormSubmitError) {
        showErrors(error);
      } else {
        setSubmitError(messageOf(error, fallbackErrorMessage));
        onSubmitError?.(error);
      }
    }
  }, onInvalid);

  const status = useMemo(
    () => ({ isSubmitting, formError, setFormError: setSubmitError, disabled }),
    [isSubmitting, formError, disabled],
  );

  const content = typeof children === 'function' ? children(form) : children;

  return (
    <FormProvider {...form}>
      <FormStatusContext.Provider value={status}>
        <form
          {...rest}
          ref={ref}
          noValidate
          aria-busy={isSubmitting || undefined}
          className={['axon-form', className].filter(Boolean).join(' ')}
          onSubmit={(event) => {
            if (beforeSubmit?.(event) === true) {
              event.preventDefault();
              return;
            }
            return submit(event);
          }}
        >
          {formError ? (
            <Alert status="danger" className="axon-form__error">
              {formError}
            </Alert>
          ) : null}
          {disabled ? (
            // A disabled fieldset disables every control inside it, the native way.
            <fieldset className="axon-form__fieldset" disabled>
              {content}
            </fieldset>
          ) : (
            content
          )}
        </form>
      </FormStatusContext.Provider>
    </FormProvider>
  );
}

/**
 * The form engine: react-hook-form with zod (or a custom validator) behind a `<form>`. It tracks
 * the submitting state, shows a form-level error banner, and turns server errors into field
 * errors. Put `FormTextField`, `FormSelect` and the other bindings inside it, or wire any input
 * with `FormField`.
 *
 * `onSubmit` receives the validated values and may be async. To report a server error, return
 * `{ fieldErrors, formError }`, throw a `FormSubmitError`, or call `helpers.setError`. Any other
 * thrown error becomes the banner message.
 */
export const Form = forwardRef(FormInner) as <
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
>(
  props: FormProps<TInput, TOutput> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
