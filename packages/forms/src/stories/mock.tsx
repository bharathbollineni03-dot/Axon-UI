import { useCallback, useState, type CSSProperties } from 'react';
import type { FormSubmitResult } from '../internal/serverErrors';

/** What the pretend server answers with. Used only by the stories. */
export interface MockServer {
  /** Milliseconds to wait before answering, to show the submitting state. Defaults to 900. */
  delay?: number;
  /** Rejects specific fields, as a server would. */
  fieldErrors?: Record<string, string>;
  /** Rejects the whole form with this message in the banner. */
  formError?: string;
  /** Throws an error with this message, as a dropped connection would. */
  throws?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A pretend `onSubmit` for stories: it waits, then succeeds, returns errors or throws. It keeps
 * the last values that were accepted, so the story can show them.
 */
export function useMockSubmit<TValues>({
  delay = 900,
  fieldErrors,
  formError,
  throws,
}: MockServer = {}) {
  const [submitted, setSubmitted] = useState<TValues | null>(null);

  const onSubmit = useCallback(
    async (values: TValues): Promise<FormSubmitResult> => {
      await sleep(delay);
      if (throws) throw new Error(throws);
      if (fieldErrors || formError) return { fieldErrors, formError };
      setSubmitted(values);
      return undefined;
    },
    [delay, fieldErrors, formError, throws],
  );

  return { onSubmit, submitted, clear: () => setSubmitted(null) };
}

const previewStyle: CSSProperties = {
  maxWidth: '26rem',
  margin: 'var(--axon-space-4) auto 0',
  padding: 'var(--axon-space-3)',
  border: '1px dashed var(--axon-color-border-strong)',
  borderRadius: 'var(--axon-radius-md)',
  color: 'var(--axon-color-text-primary)',
  fontFamily: 'var(--axon-font-mono)',
  fontSize: 'var(--axon-font-size-xs)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/** The values the pretend server accepted, as JSON. Passwords are masked. */
export function SubmittedValues({ values }: { values: unknown }) {
  if (values === null || values === undefined) return null;
  const masked = JSON.stringify(
    values,
    (key, value) => (/password/i.test(key) && typeof value === 'string' ? '••••••••' : value),
    2,
  );
  return (
    <pre style={previewStyle} aria-label="Submitted values">
      {masked}
    </pre>
  );
}
