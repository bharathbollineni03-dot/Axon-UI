import { forwardRef, useMemo, type ReactElement, type ReactNode, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button } from '@axon/core';
import { emailField, type EmailMessages } from '../../internal/validators';
import { useSubmitOutcome } from '../../internal/useSubmitOutcome';
import { AuthCard } from '../AuthCard/AuthCard';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormCheckbox, FormTextField } from '../FormBindings/FormBindings';

// ---------------------------------------------------------------------------------------------
// Schema

export interface NewsletterMessages extends EmailMessages {
  consentRequired: string;
}

export const defaultNewsletterMessages: NewsletterMessages = {
  required: 'Enter your email address.',
  invalid: 'Enter a valid email address.',
  consentRequired: 'Please agree to receive emails.',
};

export interface NewsletterSchemaOptions {
  messages?: Partial<NewsletterMessages>;
  /** Requires the consent checkbox to be ticked. Defaults to false. */
  requireConsent?: boolean;
}

/** Builds the newsletter schema, for a required consent box or translated messages. */
export function createNewsletterSchema({
  messages,
  requireConsent = false,
}: NewsletterSchemaOptions = {}) {
  const text = { ...defaultNewsletterMessages, ...messages };
  return z.object({
    name: z.string().trim(),
    email: emailField(text),
    consent: requireConsent
      ? z.boolean().refine((accepted) => accepted, text.consentRequired)
      : z.boolean(),
  });
}

/** The default schema: an email address, with an optional name and consent. */
export const newsletterSchema = createNewsletterSchema();

/** The values `NewsletterForm` submits. `name` and `consent` are empty when not shown. */
export type NewsletterValues = z.infer<typeof newsletterSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface NewsletterLabels {
  name: string;
  email: string;
  emailPlaceholder: string;
  submit: string;
  successTitle: string;
  successMessage: string;
  subscribeAnother: string;
}

export const defaultNewsletterLabels: NewsletterLabels = {
  name: 'Name',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  submit: 'Subscribe',
  successTitle: 'You are subscribed',
  successMessage: 'Thanks! Watch your inbox for the next issue.',
  subscribeAnother: 'Subscribe another address',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface NewsletterFormProps<
  TValues extends FieldValues = NewsletterValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<NewsletterLabels>;
  /** `inline` puts the email field and the button on one row; `stacked` (default) puts them in a column. */
  layout?: 'stacked' | 'inline';
  /** Adds a name field. Defaults to false. */
  showName?: boolean;
  /** Adds a consent checkbox with this label. */
  consentLabel?: ReactNode;
  /** Whether the consent checkbox must be ticked. Defaults to true when `consentLabel` is set. */
  requireConsent?: boolean;
  /** Replaces the form with a confirmation after subscribing. Defaults to true. */
  showSuccess?: boolean;
}

function NewsletterFormInner<TValues extends FieldValues = NewsletterValues>(
  {
    labels: labelsProp,
    layout = 'stacked',
    showName = false,
    consentLabel,
    requireConsent,
    showSuccess = true,
    schema,
    title = 'Subscribe to our newsletter',
    headingLevel = 2,
    card = false,
    onSubmit,
    children,
    ...shell
  }: NewsletterFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultNewsletterLabels, ...labelsProp };
  const outcome = useSubmitOutcome<TValues>(onSubmit);
  const mustConsent = Boolean(consentLabel) && (requireConsent ?? true);
  const defaultSchema = useMemo(
    () =>
      createNewsletterSchema({ requireConsent: mustConsent }) as unknown as z.ZodType<
        TValues,
        FieldValues
      >,
    [mustConsent],
  );

  if (showSuccess && outcome.succeeded) {
    return (
      <AuthCard
        ref={ref as Ref<HTMLElement>}
        logo={shell.logo}
        title={labels.successTitle}
        footer={shell.footer}
        headingLevel={headingLevel}
        size={shell.size}
        centered={shell.centered}
        bare={!card}
        className={shell.className}
      >
        <Alert status="success">{labels.successMessage}</Alert>
        <Button variant="outline" color="neutral" onClick={outcome.reset}>
          {labels.subscribeAnother}
        </Button>
      </AuthCard>
    );
  }

  const inline = layout === 'inline';
  const email = (
    <FormTextField
      name="email"
      label={labels.email}
      placeholder={labels.emailPlaceholder}
      type="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
      fullWidth
      required
    />
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      headingLevel={headingLevel}
      card={card}
      onSubmit={outcome.onSubmit}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ name: '', email: '', consent: false }}
    >
      {showName ? (
        <FormTextField name="name" label={labels.name} autoComplete="name" fullWidth />
      ) : null}
      {inline ? (
        <div className="axon-newsletter-form__row">
          {email}
          <FormActions submitLabel={labels.submit} align="start" />
        </div>
      ) : (
        email
      )}
      {consentLabel ? <FormCheckbox name="consent" label={consentLabel} /> : null}
      {children}
      {inline ? null : <FormActions submitLabel={labels.submit} align="stretch" />}
    </PrebuiltFormShell>
  );
}

/**
 * A newsletter sign-up: an email address, with an optional name and consent checkbox, stacked or
 * on one row. It renders without a card by default, to sit in a footer or a sidebar. After a
 * successful submit it shows a confirmation. `onSubmit` receives the values and does the
 * subscribing.
 */
export const NewsletterForm = forwardRef(NewsletterFormInner) as <
  TValues extends FieldValues = NewsletterValues,
>(
  props: NewsletterFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
