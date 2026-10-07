import { forwardRef, useMemo, type ReactElement, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import {
  defaultPasswordMessages,
  passwordField,
  type PasswordMessages,
  type PasswordRules,
} from '../../internal/validators';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormTextField } from '../FormBindings/FormBindings';
import {
  PasswordStrengthField,
  type PasswordStrengthLabels,
} from '../PasswordStrength/PasswordStrength';

// ---------------------------------------------------------------------------------------------
// Schema

export interface ResetPasswordMessages extends PasswordMessages {
  confirmRequired: string;
  passwordMismatch: string;
}

export const defaultResetPasswordMessages: ResetPasswordMessages = {
  ...defaultPasswordMessages,
  required: 'Enter a new password.',
  confirmRequired: 'Confirm your new password.',
  passwordMismatch: 'The passwords do not match.',
};

export interface ResetPasswordSchemaOptions {
  messages?: Partial<ResetPasswordMessages>;
  passwordRules?: PasswordRules;
}

/** Builds the reset-password schema, for other password rules or translated messages. */
export function createResetPasswordSchema({
  messages,
  passwordRules,
}: ResetPasswordSchemaOptions = {}) {
  const text = { ...defaultResetPasswordMessages, ...messages };
  return z
    .object({
      password: passwordField(passwordRules, text),
      confirmPassword: z.string().min(1, text.confirmRequired),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ['confirmPassword'],
      message: text.passwordMismatch,
    });
}

/** The default schema: a new password of 8 or more characters, confirmed. */
export const resetPasswordSchema = createResetPasswordSchema();

/** The values `ResetPasswordForm` submits. */
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface ResetPasswordLabels {
  password: string;
  confirmPassword: string;
  submit: string;
  passwordStrength: Partial<PasswordStrengthLabels>;
}

export const defaultResetPasswordLabels: ResetPasswordLabels = {
  password: 'New password',
  confirmPassword: 'Confirm new password',
  submit: 'Reset password',
  passwordStrength: {},
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ResetPasswordFormProps<
  TValues extends FieldValues = ResetPasswordValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<ResetPasswordLabels>;
  showPasswordStrength?: boolean;
  passwordRules?: PasswordRules;
}

function ResetPasswordFormInner<TValues extends FieldValues = ResetPasswordValues>(
  {
    labels: labelsProp,
    showPasswordStrength = true,
    passwordRules,
    schema,
    title = 'Choose a new password',
    children,
    ...shell
  }: ResetPasswordFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultResetPasswordLabels, ...labelsProp };
  const { minLength, requireLowercase, requireUppercase, requireNumber, requireSymbol } =
    passwordRules ?? {};
  const defaultSchema = useMemo(
    () =>
      createResetPasswordSchema({
        passwordRules: {
          minLength,
          requireLowercase,
          requireUppercase,
          requireNumber,
          requireSymbol,
        },
      }) as unknown as z.ZodType<TValues, FieldValues>,
    [minLength, requireLowercase, requireUppercase, requireNumber, requireSymbol],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ password: '', confirmPassword: '' }}
    >
      <div className="axon-registration-form__password">
        <FormTextField
          name="password"
          label={labels.password}
          type="password"
          autoComplete="new-password"
          fullWidth
          required
        />
        {showPasswordStrength ? <PasswordStrengthField labels={labels.passwordStrength} /> : null}
      </div>
      <FormTextField
        name="confirmPassword"
        label={labels.confirmPassword}
        type="password"
        autoComplete="new-password"
        fullWidth
        required
      />
      {children}
      <FormActions submitLabel={labels.submit} align="stretch" />
    </PrebuiltFormShell>
  );
}

/**
 * The form behind a "reset your password" link: a new password with a strength meter, and a
 * confirmation. The reset token stays in your app; `onSubmit` receives `{ password,
 * confirmPassword }`.
 */
export const ResetPasswordForm = forwardRef(ResetPasswordFormInner) as <
  TValues extends FieldValues = ResetPasswordValues,
>(
  props: ResetPasswordFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
