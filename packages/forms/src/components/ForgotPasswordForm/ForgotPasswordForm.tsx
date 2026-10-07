import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button, Link } from '@axon/core';
import { emailField, type EmailMessages } from '../../internal/validators';
import { useSubmitOutcome } from '../../internal/useSubmitOutcome';
import { AuthCard } from '../AuthCard/AuthCard';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormTextField } from '../FormBindings/FormBindings';

// ---------------------------------------------------------------------------------------------
// Schema

export const defaultForgotPasswordMessages: EmailMessages = {
  required: 'Enter your email address.',
  invalid: 'Enter a valid email address.',
};

/** Builds the forgot-password schema with translated messages. */
export function createForgotPasswordSchema(messages: Partial<EmailMessages> = {}) {
  return z.object({ email: emailField({ ...defaultForgotPasswordMessages, ...messages }) });
}

/** The default schema: one email address. */
export const forgotPasswordSchema = createForgotPasswordSchema();

/** The values `ForgotPasswordForm` submits. */
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface ForgotPasswordLabels {
  email: string;
  submit: string;
  backToSignIn: string;
  /** The title once the request went through. */
  successTitle: string;
  /** The message once the request went through. It receives the email the user entered. */
  successMessage: (email: string) => ReactNode;
  /** The button that returns to the form, to try another address. */
  tryAnotherEmail: string;
}

export const defaultForgotPasswordLabels: ForgotPasswordLabels = {
  email: 'Email',
  submit: 'Send reset link',
  backToSignIn: 'Back to sign in',
  successTitle: 'Check your email',
  successMessage: (email) =>
    `If an account exists for ${email}, we sent a link to reset the password.`,
  tryAnotherEmail: 'Use a different email',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ForgotPasswordFormProps<
  TValues extends FieldValues = ForgotPasswordValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<ForgotPasswordLabels>;
  /** Where the "Back to sign in" link goes. The link shows when this or `onBack` is set. */
  backHref?: string;
  onBack?: () => void;
  /**
   * Replaces the form with a confirmation once `onSubmit` finishes without errors. Defaults to
   * true; pass false to handle the next step yourself.
   */
  showSuccess?: boolean;
}

function ForgotPasswordFormInner<TValues extends FieldValues = ForgotPasswordValues>(
  {
    labels: labelsProp,
    backHref,
    onBack,
    showSuccess = true,
    schema,
    title = 'Forgot your password?',
    description = 'Enter your email and we will send you a link to reset it.',
    onSubmit,
    children,
    ...shell
  }: ForgotPasswordFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultForgotPasswordLabels, ...labelsProp };
  const outcome = useSubmitOutcome<TValues>(onSubmit);
  const hasBack = Boolean(backHref || onBack);

  const backLink = hasBack ? (
    <Link
      href={backHref ?? '#'}
      onClick={(event) => {
        if (onBack) {
          event.preventDefault();
          onBack();
        }
      }}
    >
      {labels.backToSignIn}
    </Link>
  ) : null;

  if (showSuccess && outcome.succeeded) {
    const email = String((outcome.values as { email?: unknown } | undefined)?.email ?? '');
    return (
      <AuthCard
        ref={ref as Ref<HTMLElement>}
        logo={shell.logo}
        title={labels.successTitle}
        footer={shell.footer}
        headingLevel={shell.headingLevel}
        size={shell.size}
        centered={shell.centered}
        bare={shell.card === false}
        className={shell.className}
      >
        <Alert status="success">{labels.successMessage(email)}</Alert>
        <Button variant="outline" color="neutral" fullWidth onClick={outcome.reset}>
          {labels.tryAnotherEmail}
        </Button>
        {backLink ? <div className="axon-forgot-password-form__back">{backLink}</div> : null}
      </AuthCard>
    );
  }

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      description={description}
      onSubmit={outcome.onSubmit}
      formRef={ref}
      schema={schema}
      defaultSchema={forgotPasswordSchema as unknown as z.ZodType<TValues, FieldValues>}
      baseValues={{ email: '' }}
    >
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
      {children}
      <FormActions submitLabel={labels.submit} align="stretch" />
      {backLink ? <div className="axon-forgot-password-form__back">{backLink}</div> : null}
    </PrebuiltFormShell>
  );
}

/**
 * Asks for an email address to send a password-reset link to. When `onSubmit` finishes without
 * errors it swaps itself for a "Check your email" confirmation. The email is not checked against
 * your users here: reply the same way whether or not the account exists.
 */
export const ForgotPasswordForm = forwardRef(ForgotPasswordFormInner) as <
  TValues extends FieldValues = ForgotPasswordValues,
>(
  props: ForgotPasswordFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
