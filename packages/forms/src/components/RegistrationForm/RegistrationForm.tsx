import { forwardRef, useMemo, type ReactElement, type ReactNode, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import {
  defaultPasswordMessages,
  emailField,
  passwordField,
  requiredText,
  type EmailMessages,
  type PasswordMessages,
  type PasswordRules,
} from '../../internal/validators';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormCheckbox, FormTextField } from '../FormBindings/FormBindings';
import {
  PasswordStrengthField,
  type PasswordStrengthLabels,
} from '../PasswordStrength/PasswordStrength';

// ---------------------------------------------------------------------------------------------
// Schema

export interface RegistrationMessages extends PasswordMessages {
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  confirmRequired: string;
  passwordMismatch: string;
  termsRequired: string;
}

export const defaultRegistrationMessages: RegistrationMessages = {
  ...defaultPasswordMessages,
  nameRequired: 'Enter your name.',
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address.',
  confirmRequired: 'Confirm your password.',
  passwordMismatch: 'The passwords do not match.',
  termsRequired: 'You need to accept the terms to continue.',
};

export interface RegistrationSchemaOptions {
  messages?: Partial<RegistrationMessages>;
  /** What the password must contain. Defaults to 8 or more characters. */
  passwordRules?: PasswordRules;
  /** Whether the terms checkbox must be ticked. Defaults to true. */
  requireTerms?: boolean;
}

/** Builds the registration schema, for other password rules or translated messages. */
export function createRegistrationSchema({
  messages,
  passwordRules,
  requireTerms = true,
}: RegistrationSchemaOptions = {}) {
  const text = { ...defaultRegistrationMessages, ...messages };
  const email: EmailMessages = { required: text.emailRequired, invalid: text.emailInvalid };
  return z
    .object({
      name: requiredText(text.nameRequired),
      email: emailField(email),
      password: passwordField(passwordRules, text),
      confirmPassword: z.string().min(1, text.confirmRequired),
      acceptTerms: requireTerms
        ? z.boolean().refine((accepted) => accepted, text.termsRequired)
        : z.boolean(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ['confirmPassword'],
      message: text.passwordMismatch,
    });
}

/**
 * The default registration schema: name, email, password (8 or more characters), a matching
 * confirmation and accepted terms. Extend it with `.safeExtend()`, which keeps the password check.
 */
export const registrationSchema = createRegistrationSchema();

/** The values `RegistrationForm` submits. */
export type RegistrationValues = z.infer<typeof registrationSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface RegistrationLabels {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** The terms checkbox's label. It can hold links to your terms and privacy policy. */
  terms: ReactNode;
  submit: string;
  passwordStrength: Partial<PasswordStrengthLabels>;
}

export const defaultRegistrationLabels: RegistrationLabels = {
  name: 'Full name',
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm password',
  terms: 'I agree to the terms and privacy policy',
  submit: 'Create account',
  passwordStrength: {},
};

// ---------------------------------------------------------------------------------------------
// Component

export interface RegistrationFormProps<
  TValues extends FieldValues = RegistrationValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<RegistrationLabels>;
  /** Shows a strength meter under the password. Defaults to true. */
  showPasswordStrength?: boolean;
  /** What the password must contain, checked by the default schema. */
  passwordRules?: PasswordRules;
  /** Shows the terms checkbox, and requires it. Defaults to true. */
  requireTerms?: boolean;
}

function RegistrationFormInner<TValues extends FieldValues = RegistrationValues>(
  {
    labels: labelsProp,
    showPasswordStrength = true,
    passwordRules,
    requireTerms = true,
    schema,
    title = 'Create your account',
    children,
    ...shell
  }: RegistrationFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultRegistrationLabels, ...labelsProp };
  const { minLength, requireLowercase, requireUppercase, requireNumber, requireSymbol } =
    passwordRules ?? {};
  const defaultSchema = useMemo(
    () =>
      createRegistrationSchema({
        requireTerms,
        passwordRules: {
          minLength,
          requireLowercase,
          requireUppercase,
          requireNumber,
          requireSymbol,
        },
      }) as unknown as z.ZodType<TValues, FieldValues>,
    [requireTerms, minLength, requireLowercase, requireUppercase, requireNumber, requireSymbol],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ name: '', email: '', password: '', confirmPassword: '', acceptTerms: false }}
    >
      <FormTextField name="name" label={labels.name} autoComplete="name" fullWidth required />
      <FormTextField
        name="email"
        label={labels.email}
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        fullWidth
        required
      />
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
      {requireTerms ? <FormCheckbox name="acceptTerms" label={labels.terms} /> : null}
      <FormActions submitLabel={labels.submit} align="stretch" />
    </PrebuiltFormShell>
  );
}

/**
 * A sign-up form: name, email, password with a strength meter, a matching confirmation and a
 * terms checkbox. Add your own fields as `children` (and to a schema made with `.safeExtend()`).
 * It makes no network calls: `onSubmit` receives `{ name, email, password, confirmPassword,
 * acceptTerms }`, and can return `{ fieldErrors: { email: 'Already registered' } }`.
 */
export const RegistrationForm = forwardRef(RegistrationFormInner) as <
  TValues extends FieldValues = RegistrationValues,
>(
  props: RegistrationFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
