import { forwardRef, useMemo, useRef, useState, type ReactElement, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@axonui/core';
import { useCountdown } from '../../internal/useCountdown';
import { useMergedRef } from '../../internal/mergeRefs';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormOTPInput } from '../FormBindings/FormBindings';
import { useFormStatus } from '../Form/FormStatus';

// ---------------------------------------------------------------------------------------------
// Schema

export interface OTPVerificationMessages {
  required: string;
  incomplete: (length: number) => string;
}

export const defaultOTPVerificationMessages: OTPVerificationMessages = {
  required: 'Enter the code we sent you.',
  incomplete: (length) => `Enter all ${length} characters of the code.`,
};

export interface OTPVerificationSchemaOptions {
  /** How many characters the code has. Defaults to 6. */
  length?: number;
  /** Which characters it may contain. Defaults to `numeric`. */
  type?: 'numeric' | 'alphanumeric' | 'text';
  messages?: Partial<OTPVerificationMessages>;
}

/** Builds the verification schema, for another code length or translated messages. */
export function createOTPVerificationSchema({
  length = 6,
  type = 'numeric',
  messages,
}: OTPVerificationSchemaOptions = {}) {
  const text = { ...defaultOTPVerificationMessages, ...messages };
  const characters =
    type === 'numeric' ? /^\d+$/ : type === 'alphanumeric' ? /^[A-Za-z0-9]+$/ : /./;
  return z.object({
    code: z
      .string()
      .min(1, text.required)
      .length(length, text.incomplete(length))
      .regex(characters, text.incomplete(length)),
  });
}

/** The default schema: a 6-digit code. */
export const otpVerificationSchema = createOTPVerificationSchema();

/** The values `OTPVerificationForm` submits. */
export type OTPVerificationValues = z.infer<typeof otpVerificationSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface OTPVerificationLabels {
  code: string;
  submit: string;
  /** The resend button when it can be pressed. */
  resend: string;
  /** The resend button while it counts down; receives the seconds left. */
  resendIn: (seconds: number) => string;
  /** Confirmation after a code was sent again. */
  resent: string;
  /** Shown when `onResend` fails and has no message of its own. */
  resendFailed: string;
}

export const defaultOTPVerificationLabels: OTPVerificationLabels = {
  code: 'Verification code',
  submit: 'Verify',
  resend: 'Resend code',
  resendIn: (seconds) => `Resend code in ${seconds}s`,
  resent: 'We sent you a new code.',
  resendFailed: 'We could not send a new code. Try again in a moment.',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface OTPVerificationFormProps<
  TValues extends FieldValues = OTPVerificationValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<OTPVerificationLabels>;
  /** How many characters the code has. Defaults to 6. */
  length?: number;
  /** Which characters the code may contain. Defaults to `numeric`. */
  codeType?: 'numeric' | 'alphanumeric' | 'text';
  /** Focuses the code field when the form appears. Defaults to false, so the form never takes focus unasked. */
  autoFocus?: boolean;
  /** Submits as soon as the last character is entered. Defaults to false. */
  autoSubmit?: boolean;
  /** Sends the code again. The resend button shows when this is set. */
  onResend?: () => void | Promise<void>;
  /** Seconds before the code can be sent again. Defaults to 30. */
  resendCooldown?: number;
  /**
   * Whether the countdown starts when the form appears, because a code was just sent. Defaults
   * to true.
   */
  startCooldownOnMount?: boolean;
}

/** The resend button and its countdown. It lives inside the form to reach its error banner. */
function ResendCode({
  labels,
  cooldown,
  startOnMount,
  onResend,
}: {
  labels: OTPVerificationLabels;
  cooldown: number;
  startOnMount: boolean;
  onResend: () => void | Promise<void>;
}) {
  const { remaining, restart } = useCountdown(cooldown, startOnMount);
  const { setFormError } = useFormStatus();
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);

  const resend = async () => {
    setSending(true);
    setResent(false);
    setFormError(null);
    try {
      await onResend();
      restart();
      setResent(true);
    } catch (error) {
      setFormError(error instanceof Error && error.message ? error.message : labels.resendFailed);
    } finally {
      setSending(false);
    }
  };

  const waiting = remaining > 0;
  return (
    <div className="axon-otp-form__resend">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        loading={sending}
        disabled={waiting}
        onClick={resend}
      >
        {waiting ? labels.resendIn(remaining) : labels.resend}
      </Button>
      {/* A polite live region that exists from the start, so the confirmation is announced. */}
      <span className="axon-otp-form__resent" role="status">
        {resent ? labels.resent : ''}
      </span>
    </div>
  );
}

function OTPVerificationFormInner<TValues extends FieldValues = OTPVerificationValues>(
  {
    labels: labelsProp,
    length = 6,
    codeType = 'numeric',
    autoFocus = false,
    autoSubmit = false,
    onResend,
    resendCooldown = 30,
    startCooldownOnMount = true,
    schema,
    title = 'Enter your code',
    children,
    ...shell
  }: OTPVerificationFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
): ReactElement {
  const labels = { ...defaultOTPVerificationLabels, ...labelsProp };
  const formRef = useRef<HTMLFormElement>(null);
  const mergedRef = useMergedRef<HTMLFormElement>(ref, formRef);
  const defaultSchema = useMemo(
    () =>
      createOTPVerificationSchema({ length, type: codeType }) as unknown as z.ZodType<
        TValues,
        FieldValues
      >,
    [length, codeType],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      formRef={mergedRef}
      schema={schema}
      defaultSchema={defaultSchema}
      baseValues={{ code: '' }}
    >
      <FormOTPInput
        name="code"
        label={labels.code}
        length={length}
        type={codeType}
        // Opt-in (`autoFocus` is false by default): on a page that exists to enter this one code,
        // starting in the field is what people want.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        required
        onComplete={autoSubmit ? () => formRef.current?.requestSubmit() : undefined}
      />
      {children}
      <FormActions submitLabel={labels.submit} align="stretch" />
      {onResend ? (
        <ResendCode
          labels={labels}
          cooldown={resendCooldown}
          startOnMount={startCooldownOnMount}
          onResend={onResend}
        />
      ) : null}
    </PrebuiltFormShell>
  );
}

/**
 * Asks for a one-time code, with a resend button that counts down between sends. The code is
 * not checked here: `onSubmit` receives `{ code }` and can return
 * `{ fieldErrors: { code: 'That code is wrong.' } }`. `onResend` sends a new one.
 */
export const OTPVerificationForm = forwardRef(OTPVerificationFormInner) as <
  TValues extends FieldValues = OTPVerificationValues,
>(
  props: OTPVerificationFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
