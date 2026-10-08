import { forwardRef, useMemo, type ReactElement, type ReactNode, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { Divider, Link } from '@axon/core';
import { emailField, requiredText, type EmailMessages } from '../../internal/validators';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormCheckbox, FormTextField } from '../FormBindings/FormBindings';

// ---------------------------------------------------------------------------------------------
// Schema

export interface LoginMessages extends EmailMessages {
  /** Shown when the username is empty. */
  usernameRequired: string;
  passwordRequired: string;
}

export const defaultLoginMessages: LoginMessages = {
  required: 'Enter your email address.',
  invalid: 'Enter a valid email address.',
  usernameRequired: 'Enter your username.',
  passwordRequired: 'Enter your password.',
};

export interface LoginSchemaOptions {
  /**
   * What the first field takes: an `email` (checked for its format), a `username`, or `either`
   * (any text; the server decides). Defaults to `email`.
   */
  identifier?: 'email' | 'username' | 'either';
  messages?: Partial<LoginMessages>;
}

/** Builds the login schema, for another identifier type or translated messages. */
export function createLoginSchema({ identifier = 'email', messages }: LoginSchemaOptions = {}) {
  const text = { ...defaultLoginMessages, ...messages };
  return z.object({
    identifier:
      identifier === 'email'
        ? emailField(text)
        : requiredText(identifier === 'either' ? text.required : text.usernameRequired),
    password: z.string().min(1, text.passwordRequired),
    remember: z.boolean(),
  });
}

/** The default login schema: an email address and a password. Extend it with `.safeExtend()`. */
export const loginSchema = createLoginSchema();

/** The values `LoginForm` submits. */
export type LoginValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface LoginLabels {
  email: string;
  username: string;
  /** Used when `identifier` is `either`. */
  emailOrUsername: string;
  password: string;
  remember: string;
  forgotPassword: string;
  submit: string;
  /** The word between the form and the social login buttons. */
  or: string;
}

export const defaultLoginLabels: LoginLabels = {
  email: 'Email',
  username: 'Username',
  emailOrUsername: 'Email or username',
  password: 'Password',
  remember: 'Remember me',
  forgotPassword: 'Forgot password?',
  submit: 'Sign in',
  or: 'or',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface LoginFormProps<
  TValues extends FieldValues = LoginValues,
> extends PrebuiltFormProps<TValues> {
  /** What people sign in with. Defaults to `email`. Pass a matching `schema` if you change it. */
  identifier?: 'email' | 'username' | 'either';
  /** Translate or reword any text. */
  labels?: Partial<LoginLabels>;
  /** Shows the "Remember me" checkbox. Defaults to true. */
  showRememberMe?: boolean;
  /** Where the "Forgot password?" link goes. The link shows when this or `onForgotPassword` is set. */
  forgotPasswordHref?: string;
  /** Runs when "Forgot password?" is clicked, for a link that opens a dialog or a client route. */
  onForgotPassword?: () => void;
  /** Buttons for signing in with another service, shown under the form after an "or" divider. */
  socialLogins?: ReactNode;
}

function LoginFormInner<TValues extends FieldValues = LoginValues>(
  {
    identifier = 'email',
    labels: labelsProp,
    showRememberMe = true,
    forgotPasswordHref,
    onForgotPassword,
    socialLogins,
    schema,
    title = 'Sign in',
    children,
    ...shell
  }: LoginFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultLoginLabels, ...labelsProp };
  const identifierLabel =
    identifier === 'email'
      ? labels.email
      : identifier === 'username'
        ? labels.username
        : labels.emailOrUsername;
  const hasForgot = Boolean(forgotPasswordHref || onForgotPassword);
  const defaultSchema = useMemo(
    () => createLoginSchema({ identifier }) as unknown as z.ZodType<TValues, FieldValues>,
    [identifier],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ identifier: '', password: '', remember: false }}
    >
      <FormTextField
        name="identifier"
        label={identifierLabel}
        type={identifier === 'username' ? 'text' : 'email'}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        inputMode={identifier === 'email' ? 'email' : undefined}
        fullWidth
        required
      />
      <FormTextField
        name="password"
        label={labels.password}
        type="password"
        autoComplete="current-password"
        fullWidth
        required
      />
      {showRememberMe || hasForgot ? (
        <div className="axon-login-form__options">
          {showRememberMe ? <FormCheckbox name="remember" label={labels.remember} /> : <span />}
          {hasForgot ? (
            <Link
              href={forgotPasswordHref ?? '#'}
              onClick={(event) => {
                if (onForgotPassword) {
                  event.preventDefault();
                  onForgotPassword();
                }
              }}
            >
              {labels.forgotPassword}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
      <FormActions submitLabel={labels.submit} align="stretch" />
      {socialLogins ? (
        <>
          <Divider>{labels.or}</Divider>
          <div className="axon-auth-social">{socialLogins}</div>
        </>
      ) : null}
    </PrebuiltFormShell>
  );
}

/**
 * A sign-in form: email or username, password, "remember me", a forgot-password link, optional
 * social buttons and an error banner. It makes no network calls; `onSubmit` receives
 * `{ identifier, password, remember }` and decides what happens.
 */
export const LoginForm = forwardRef(LoginFormInner) as <TValues extends FieldValues = LoginValues>(
  props: LoginFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
