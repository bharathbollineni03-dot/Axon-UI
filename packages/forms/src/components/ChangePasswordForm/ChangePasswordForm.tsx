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

export interface ChangePasswordMessages extends PasswordMessages {
  currentRequired: string;
  confirmRequired: string;
  passwordMismatch: string;
  sameAsCurrent: string;
}

export const defaultChangePasswordMessages: ChangePasswordMessages = {
  ...defaultPasswordMessages,
  required: 'Enter a new password.',
  currentRequired: 'Enter your current password.',
  confirmRequired: 'Confirm your new password.',
  passwordMismatch: 'The passwords do not match.',
  sameAsCurrent: 'Choose a password you have not used here before.',
};

export interface ChangePasswordSchemaOptions {
  messages?: Partial<ChangePasswordMessages>;
  passwordRules?: PasswordRules;
  /** Rejects a new password equal to the current one. Defaults to true. */
  disallowSamePassword?: boolean;
}

/** Builds the change-password schema, for other password rules or translated messages. */
export function createChangePasswordSchema({
  messages,
  passwordRules,
  disallowSamePassword = true,
}: ChangePasswordSchemaOptions = {}) {
  const text = { ...defaultChangePasswordMessages, ...messages };
  return z
    .object({
      currentPassword: z.string().min(1, text.currentRequired),
      newPassword: passwordField(passwordRules, text),
      confirmPassword: z.string().min(1, text.confirmRequired),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ['confirmPassword'],
      message: text.passwordMismatch,
    })
    .refine((values) => !disallowSamePassword || values.newPassword !== values.currentPassword, {
      path: ['newPassword'],
      message: text.sameAsCurrent,
    });
}

/** The default schema: the current password, and a confirmed new one that differs from it. */
export const changePasswordSchema = createChangePasswordSchema();

/** The values `ChangePasswordForm` submits. */
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface ChangePasswordLabels {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  submit: string;
  passwordStrength: Partial<PasswordStrengthLabels>;
}

export const defaultChangePasswordLabels: ChangePasswordLabels = {
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmPassword: 'Confirm new password',
  submit: 'Change password',
  passwordStrength: {},
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ChangePasswordFormProps<
  TValues extends FieldValues = ChangePasswordValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<ChangePasswordLabels>;
  showPasswordStrength?: boolean;
  passwordRules?: PasswordRules;
  /** Rejects a new password equal to the current one. Defaults to true. */
  disallowSamePassword?: boolean;
}

function ChangePasswordFormInner<TValues extends FieldValues = ChangePasswordValues>(
  {
    labels: labelsProp,
    showPasswordStrength = true,
    passwordRules,
    disallowSamePassword = true,
    schema,
    title = 'Change password',
    headingLevel = 2,
    children,
    ...shell
  }: ChangePasswordFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultChangePasswordLabels, ...labelsProp };
  const { minLength, requireLowercase, requireUppercase, requireNumber, requireSymbol } =
    passwordRules ?? {};
  const defaultSchema = useMemo(
    () =>
      createChangePasswordSchema({
        disallowSamePassword,
        passwordRules: {
          minLength,
          requireLowercase,
          requireUppercase,
          requireNumber,
          requireSymbol,
        },
      }) as unknown as z.ZodType<TValues, FieldValues>,
    [
      disallowSamePassword,
      minLength,
      requireLowercase,
      requireUppercase,
      requireNumber,
      requireSymbol,
    ],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      headingLevel={headingLevel}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
    >
      <FormTextField
        name="currentPassword"
        label={labels.currentPassword}
        type="password"
        autoComplete="current-password"
        fullWidth
        required
      />
      <div className="axon-registration-form__password">
        <FormTextField
          name="newPassword"
          label={labels.newPassword}
          type="password"
          autoComplete="new-password"
          fullWidth
          required
        />
        {showPasswordStrength ? (
          <PasswordStrengthField name="newPassword" labels={labels.passwordStrength} />
        ) : null}
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
 * For a signed-in user changing their password: the current one, a new one with a strength
 * meter, and a confirmation. A wrong current password is for your server to report: return
 * `{ fieldErrors: { currentPassword: 'That is not your password.' } }` from `onSubmit`.
 */
export const ChangePasswordForm = forwardRef(ChangePasswordFormInner) as <
  TValues extends FieldValues = ChangePasswordValues,
>(
  props: ChangePasswordFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
