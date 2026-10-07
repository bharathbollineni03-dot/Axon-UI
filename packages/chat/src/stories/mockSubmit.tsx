import { useCallback, useState, type CSSProperties } from 'react';

/** What the pretend server answers with. Used only by the stories. */
export interface MockServer {
  /** Milliseconds to wait before answering, to show the submitting state. Defaults to 700. */
  delay?: number;
  /** Rejects specific fields, as a server would. */
  fieldErrors?: Record<string, string>;
  /** Rejects the whole form with this message in the banner. */
  formError?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SubmitResult = { fieldErrors?: Record<string, string>; formError?: string } | undefined;

/**
 * A pretend `onSubmit` for stories: it waits, then succeeds or returns errors. It keeps the last
 * values that were accepted, so the story can show them.
 */
export function useMockSubmit<TValues>({ delay = 700, fieldErrors, formError }: MockServer = {}) {
  const [submitted, setSubmitted] = useState<TValues | null>(null);

  const onSubmit = useCallback(
    async (values: TValues): Promise<SubmitResult> => {
      await sleep(delay);
      if (fieldErrors || formError) return { fieldErrors, formError };
      setSubmitted(values);
      return undefined;
    },
    [delay, fieldErrors, formError],
  );

  return { onSubmit, submitted, clear: () => setSubmitted(null) };
}

const previewStyle: CSSProperties = {
  margin: 'var(--axon-space-4) 0 0',
  padding: 'var(--axon-space-3)',
  border: '1px dashed var(--axon-color-border-strong)',
  borderRadius: 'var(--axon-radius-md)',
  color: 'var(--axon-color-text-primary)',
  fontFamily: 'var(--axon-font-mono)',
  fontSize: 'var(--axon-font-size-xs)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

/** The values the pretend server accepted, as JSON. Secrets are masked; files show their name. */
export function SubmittedValues({ values }: { values: unknown }) {
  if (values === null || values === undefined) return null;
  const text = JSON.stringify(
    values,
    (key, value) => {
      if (/password|api_?key|secret/i.test(key) && typeof value === 'string' && value) {
        return '••••••••';
      }
      if (typeof File !== 'undefined' && value instanceof File) {
        return { name: value.name, size: value.size };
      }
      return value;
    },
    2,
  );
  return (
    <pre style={previewStyle} aria-label="Submitted values">
      {text}
    </pre>
  );
}
