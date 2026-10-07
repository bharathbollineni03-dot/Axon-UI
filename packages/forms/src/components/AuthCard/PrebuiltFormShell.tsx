import type { ReactNode, Ref } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { Form, type FormProps } from '../Form/Form';
import { AuthCard, type AuthCardProps } from './AuthCard';

/**
 * The props every prebuilt form shares. Each form adds its own (labels, extra options) to these.
 * Nothing here talks to a network: the form hands validated values to `onSubmit`, and shows the
 * errors you return from it.
 */
export interface PrebuiltFormProps<TValues extends FieldValues> extends Pick<
  FormProps<FieldValues, TValues>,
  | 'onSubmit'
  | 'onInvalid'
  | 'onSubmitError'
  | 'mode'
  | 'disabled'
  | 'resetOnSuccess'
  | 'fallbackErrorMessage'
> {
  /** Called with the validated values. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: FormProps<FieldValues, TValues>['onSubmit'];
  /** Starting values for some or all of the fields. */
  defaultValues?: DefaultValues<FieldValues>;
  /**
   * Replaces the form's schema. Start from the schema the form exports and extend it with
   * `.safeExtend()` to add fields or rules, then render the extra fields as `children`.
   */
  schema?: z.ZodType<TValues, FieldValues>;
  logo?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Links under the form. */
  footer?: ReactNode;
  /** The title's heading level. Defaults to 1; use 2 or 3 when the form sits inside a page. */
  headingLevel?: AuthCardProps['headingLevel'];
  /** Width of the card. */
  size?: AuthCardProps['size'];
  /** Wraps the form in a card. Pass `false` to render just the header, the fields and the footer. */
  card?: boolean;
  /** Fills the viewport and centers the card in it. */
  centered?: boolean;
  /** An error for the banner above the fields, from your own state. */
  error?: ReactNode;
  className?: string;
  /** Extra fields, placed after the built-in ones and before the submit button. */
  children?: ReactNode;
}

interface ShellProps<TValues extends FieldValues> extends PrebuiltFormProps<TValues> {
  /** The schema the form uses when `schema` is not given. */
  defaultSchema: z.ZodType<TValues, FieldValues>;
  /** The values the form uses for fields not in `defaultValues`. */
  baseValues: DefaultValues<FieldValues>;
  formRef?: Ref<HTMLFormElement>;
}

/** The card, header, footer and `Form` that every prebuilt form is built from. */
export function PrebuiltFormShell<TValues extends FieldValues>({
  defaultSchema,
  baseValues,
  formRef,
  schema,
  defaultValues,
  error,
  logo,
  title,
  description,
  footer,
  headingLevel,
  size,
  card = true,
  centered,
  className,
  children,
  ...formProps
}: ShellProps<TValues>) {
  return (
    <AuthCard
      logo={logo}
      title={title}
      description={description}
      footer={footer}
      headingLevel={headingLevel}
      size={size}
      centered={centered}
      bare={!card}
      className={className}
    >
      <Form<FieldValues, TValues>
        {...formProps}
        ref={formRef}
        schema={schema ?? defaultSchema}
        defaultValues={{ ...baseValues, ...defaultValues }}
        formError={error}
      >
        {children}
      </Form>
    </AuthCard>
  );
}
