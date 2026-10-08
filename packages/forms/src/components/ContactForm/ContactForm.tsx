import { forwardRef, useMemo, type ReactElement, type ReactNode, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Button } from '@axonui/core';
import { emailField, requiredText } from '../../internal/validators';
import { useSubmitOutcome } from '../../internal/useSubmitOutcome';
import { AuthCard } from '../AuthCard/AuthCard';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import {
  FormCheckbox,
  FormSelect,
  FormTextArea,
  FormTextField,
} from '../FormBindings/FormBindings';

// ---------------------------------------------------------------------------------------------
// Schema

export interface ContactMessages {
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  messageRequired: string;
  messageTooShort: (min: number) => string;
  messageTooLong: (max: number) => string;
  consentRequired: string;
}

export const defaultContactMessages: ContactMessages = {
  nameRequired: 'Enter your name.',
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address.',
  messageRequired: 'Write a message.',
  messageTooShort: (min) => `Write at least ${min} characters.`,
  messageTooLong: (max) => `Keep your message to ${max} characters or fewer.`,
  consentRequired: 'Please agree to continue.',
};

export interface ContactSchemaOptions {
  messages?: Partial<ContactMessages>;
  /** Shortest message, in characters. Defaults to 10. */
  minMessageLength?: number;
  /** Longest message, in characters. Defaults to 2000. */
  maxMessageLength?: number;
  /** Requires the consent checkbox to be ticked. Defaults to false. */
  requireConsent?: boolean;
}

/** Builds the contact schema, for other limits or translated messages. */
export function createContactSchema({
  messages,
  minMessageLength = 10,
  maxMessageLength = 2000,
  requireConsent = false,
}: ContactSchemaOptions = {}) {
  const text = { ...defaultContactMessages, ...messages };
  return z.object({
    name: requiredText(text.nameRequired),
    email: emailField({ required: text.emailRequired, invalid: text.emailInvalid }),
    topic: z.string().nullable(),
    subject: z.string(),
    message: z
      .string()
      .trim()
      .min(1, text.messageRequired)
      .min(minMessageLength, text.messageTooShort(minMessageLength))
      .max(maxMessageLength, text.messageTooLong(maxMessageLength)),
    consent: requireConsent
      ? z.boolean().refine((accepted) => accepted, text.consentRequired)
      : z.boolean(),
  });
}

/** The default schema: name, email, a message of 10 to 2000 characters, and optional extras. */
export const contactSchema = createContactSchema();

/** The values `ContactForm` submits. `topic`, `subject` and `consent` are empty when not shown. */
export type ContactValues = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface ContactLabels {
  name: string;
  email: string;
  topic: string;
  topicPlaceholder: string;
  subject: string;
  message: string;
  submit: string;
  successTitle: string;
  successMessage: string;
  sendAnother: string;
}

export const defaultContactLabels: ContactLabels = {
  name: 'Name',
  email: 'Email',
  topic: 'Topic',
  topicPlaceholder: 'Choose a topic',
  subject: 'Subject',
  message: 'Message',
  submit: 'Send message',
  successTitle: 'Message sent',
  successMessage: 'Thanks for getting in touch. We will reply as soon as we can.',
  sendAnother: 'Send another message',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ContactFormProps<
  TValues extends FieldValues = ContactValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<ContactLabels>;
  /** Adds a topic select with these choices. */
  topics?: { value: string; label: string }[];
  /** Adds a subject line. Defaults to false. */
  showSubject?: boolean;
  /** Adds a consent checkbox with this label, e.g. a link to your privacy policy. */
  consentLabel?: ReactNode;
  /** Whether the consent checkbox must be ticked. Defaults to true when `consentLabel` is set. */
  requireConsent?: boolean;
  /** Shortest message, in characters. Defaults to 10. */
  minMessageLength?: number;
  /** Longest message, in characters. Defaults to 2000. */
  maxMessageLength?: number;
  /** Replaces the form with a confirmation after a successful send. Defaults to true. */
  showSuccess?: boolean;
}

function ContactFormInner<TValues extends FieldValues = ContactValues>(
  {
    labels: labelsProp,
    topics,
    showSubject = false,
    consentLabel,
    requireConsent,
    minMessageLength = 10,
    maxMessageLength = 2000,
    showSuccess = true,
    schema,
    title = 'Contact us',
    headingLevel = 2,
    onSubmit,
    children,
    ...shell
  }: ContactFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultContactLabels, ...labelsProp };
  const outcome = useSubmitOutcome<TValues>(onSubmit);
  const mustConsent = Boolean(consentLabel) && (requireConsent ?? true);
  const defaultSchema = useMemo(
    () =>
      createContactSchema({
        minMessageLength,
        maxMessageLength,
        requireConsent: mustConsent,
      }) as unknown as z.ZodType<TValues, FieldValues>,
    [minMessageLength, maxMessageLength, mustConsent],
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
        bare={shell.card === false}
        className={shell.className}
      >
        <Alert status="success">{labels.successMessage}</Alert>
        <Button variant="outline" color="neutral" fullWidth onClick={outcome.reset}>
          {labels.sendAnother}
        </Button>
      </AuthCard>
    );
  }

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      headingLevel={headingLevel}
      onSubmit={outcome.onSubmit}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ name: '', email: '', topic: null, subject: '', message: '', consent: false }}
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
      {topics?.length ? (
        <FormSelect
          name="topic"
          label={labels.topic}
          placeholder={labels.topicPlaceholder}
          options={topics}
          fullWidth
        />
      ) : null}
      {showSubject ? <FormTextField name="subject" label={labels.subject} fullWidth /> : null}
      <FormTextArea
        name="message"
        label={labels.message}
        maxLength={maxMessageLength}
        showCount
        minRows={5}
        fullWidth
        required
      />
      {consentLabel ? <FormCheckbox name="consent" label={consentLabel} /> : null}
      {children}
      <FormActions submitLabel={labels.submit} align="stretch" />
    </PrebuiltFormShell>
  );
}

/**
 * A "get in touch" form: name, email, an optional topic and subject, a message with a counter,
 * and an optional consent checkbox. After a successful send it shows a confirmation with a button
 * to write another message. `onSubmit` receives the values and does the sending.
 */
export const ContactForm = forwardRef(ContactFormInner) as <
  TValues extends FieldValues = ContactValues,
>(
  props: ContactFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
