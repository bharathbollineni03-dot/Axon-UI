import { forwardRef, useMemo, useState, type ReactNode, type Ref } from 'react';
import { Alert, Button } from '@axonui/core';
import {
  Form,
  FormActions,
  FormSelect,
  FormTextField,
  useFormContext,
  useWatch,
  z,
  type FieldValues,
  type FormHelpers,
  type FormSubmitResult,
} from '@axonui/forms';

// ---------------------------------------------------------------------------------------------
// Types

export interface ApiKeyProvider {
  id: string;
  name: string;
  /** What this provider's keys start with, such as `sk-`. A key that does not is rejected. */
  keyPrefix?: string;
  /** An example key for the placeholder, such as `sk-…`. */
  keyExample?: string;
  /** The provider's usual address, shown as the placeholder of the address field. */
  baseUrl?: string;
  /** Asks for an address, for self-hosted and compatible providers. */
  requiresBaseUrl?: boolean;
}

/** What `APIKeyForm` submits. `apiKey` is empty when the stored key is being kept. */
export interface ApiKeyValues {
  provider: string;
  apiKey: string;
  baseUrl: string;
}

export interface ApiKeyTestResult {
  ok: boolean;
  /** Shown under the button, such as "Connected to 12 models" or the provider's error. */
  message?: string;
}

// ---------------------------------------------------------------------------------------------
// Schema

export interface ApiKeyMessages {
  providerRequired: string;
  keyRequired: string;
  keyTooShort: string;
  keyPrefix: (providerName: string, prefix: string) => string;
  baseUrlRequired: string;
  baseUrlInvalid: string;
}

export const defaultApiKeyMessages: ApiKeyMessages = {
  providerRequired: 'Choose a provider.',
  keyRequired: 'Enter your API key.',
  keyTooShort: 'This key looks too short.',
  keyPrefix: (providerName, prefix) => `${providerName} keys start with “${prefix}”.`,
  baseUrlRequired: 'Enter the address of the API.',
  baseUrlInvalid: 'Enter a full address starting with http:// or https://.',
};

export interface ApiKeySchemaOptions {
  providers: readonly ApiKeyProvider[];
  /** A key is already saved, so leaving the field empty keeps it. */
  hasStoredKey?: boolean;
  messages?: Partial<ApiKeyMessages>;
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Builds the schema for a list of providers, for translated messages or your own rules. */
export function createApiKeySchema({
  providers,
  hasStoredKey = false,
  messages,
}: ApiKeySchemaOptions) {
  const text = { ...defaultApiKeyMessages, ...messages };
  return z
    .object({
      provider: z.string({ error: text.providerRequired }).min(1, text.providerRequired),
      apiKey: z.string().trim(),
      baseUrl: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      const provider = providers.find((item) => item.id === values.provider);
      if (!values.apiKey) {
        if (!hasStoredKey) {
          ctx.addIssue({ code: 'custom', path: ['apiKey'], message: text.keyRequired });
        }
      } else if (values.apiKey.length < 8) {
        ctx.addIssue({ code: 'custom', path: ['apiKey'], message: text.keyTooShort });
      } else if (provider?.keyPrefix && !values.apiKey.startsWith(provider.keyPrefix)) {
        ctx.addIssue({
          code: 'custom',
          path: ['apiKey'],
          message: text.keyPrefix(provider.name, provider.keyPrefix),
        });
      }
      if (!values.baseUrl) {
        if (provider?.requiresBaseUrl) {
          ctx.addIssue({ code: 'custom', path: ['baseUrl'], message: text.baseUrlRequired });
        }
      } else if (!isHttpUrl(values.baseUrl)) {
        ctx.addIssue({ code: 'custom', path: ['baseUrl'], message: text.baseUrlInvalid });
      }
    });
}

// ---------------------------------------------------------------------------------------------
// Labels

export interface ApiKeyLabels {
  provider: string;
  providerPlaceholder: string;
  apiKey: string;
  apiKeyHelp: string;
  storedKeyPlaceholder: string;
  storedKeyHelp: string;
  baseUrl: string;
  baseUrlHelp: string;
  test: string;
  testing: string;
  connected: string;
  connectionFailed: string;
  submit: string;
}

export const defaultApiKeyLabels: ApiKeyLabels = {
  provider: 'Provider',
  providerPlaceholder: 'Choose a provider',
  apiKey: 'API key',
  apiKeyHelp: 'Your key is sent only where you save it. It is never shown again after saving.',
  storedKeyPlaceholder: '•••••••• (saved)',
  storedKeyHelp: 'A key is saved. Leave this empty to keep it, or enter a new one to replace it.',
  baseUrl: 'API address',
  baseUrlHelp: 'The base URL of the API.',
  test: 'Test connection',
  testing: 'Testing…',
  connected: 'Connected.',
  connectionFailed: 'The connection failed.',
  submit: 'Save key',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface APIKeyFormProps {
  providers: readonly ApiKeyProvider[];
  /** Starting values. The provider defaults to the first one. The key is never prefilled. */
  defaultValues?: Partial<Omit<ApiKeyValues, 'apiKey'>>;
  /** A key is already saved: the key field may be left empty to keep it. */
  hasStoredKey?: boolean;
  /** Called with the validated values. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: (
    values: ApiKeyValues,
    helpers: FormHelpers<FieldValues, ApiKeyValues>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  /**
   * Shows a "Test connection" button. It checks the values first, then calls this and shows
   * the result. Make the request from your server: the form never contacts a provider itself.
   */
  onTestConnection?: (values: ApiKeyValues) => Promise<ApiKeyTestResult>;
  onCancel?: () => void;
  /** Replaces the schema. Start from `createApiKeySchema({ providers })`. */
  schema?: z.ZodType<ApiKeyValues, FieldValues>;
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  className?: string;
  labels?: Partial<ApiKeyLabels>;
}

interface BodyProps {
  providers: readonly ApiKeyProvider[];
  hasStoredKey: boolean;
  labels: ApiKeyLabels;
  disabled?: boolean;
  onTestConnection?: APIKeyFormProps['onTestConnection'];
  onCancel?: () => void;
}

function Body({
  providers,
  hasStoredKey,
  labels,
  disabled,
  onTestConnection,
  onCancel,
}: BodyProps) {
  const { control, getValues, trigger } = useFormContext<ApiKeyValues>();
  const values = useWatch({ control }) as Partial<ApiKeyValues>;
  const provider = providers.find((item) => item.id === values.provider);
  const [test, setTest] = useState<{ for: string; result: ApiKeyTestResult } | null>(null);
  const [testing, setTesting] = useState(false);

  // A result belongs to the values it was run with; once any of them change it is out of date.
  const signature = JSON.stringify([values.provider, values.apiKey, values.baseUrl]);
  const shownResult = test && test.for === signature ? test.result : null;

  const runTest = async () => {
    if (!(await trigger(undefined, { shouldFocus: true }))) return;
    const current = getValues();
    const forValues = JSON.stringify([current.provider, current.apiKey, current.baseUrl]);
    setTesting(true);
    try {
      const result = await onTestConnection!({
        provider: current.provider,
        apiKey: current.apiKey.trim(),
        baseUrl: current.baseUrl.trim(),
      });
      setTest({ for: forValues, result });
    } catch (caught) {
      setTest({
        for: forValues,
        result: { ok: false, message: caught instanceof Error ? caught.message : undefined },
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <FormSelect
        name="provider"
        label={labels.provider}
        placeholder={labels.providerPlaceholder}
        options={providers.map((item) => ({ value: item.id, label: item.name }))}
        fullWidth
        required
      />
      <FormTextField
        name="apiKey"
        type="password"
        label={labels.apiKey}
        helperText={hasStoredKey ? labels.storedKeyHelp : labels.apiKeyHelp}
        placeholder={hasStoredKey ? labels.storedKeyPlaceholder : provider?.keyExample}
        // The key is a secret, not a login: stop password managers filling it with a saved password.
        autoComplete="new-password"
        autoCapitalize="none"
        spellCheck={false}
        fullWidth
        required={!hasStoredKey}
      />
      {provider?.requiresBaseUrl ? (
        <FormTextField
          name="baseUrl"
          type="url"
          label={labels.baseUrl}
          helperText={labels.baseUrlHelp}
          placeholder={provider.baseUrl}
          autoCapitalize="none"
          spellCheck={false}
          fullWidth
          required
        />
      ) : null}

      {onTestConnection ? (
        <div className="axon-api-key__test">
          <Button
            type="button"
            variant="outline"
            onClick={runTest}
            loading={testing}
            disabled={disabled}
          >
            {testing ? labels.testing : labels.test}
          </Button>
          <div role="status" className="axon-api-key__result">
            {shownResult ? (
              <Alert status={shownResult.ok ? 'success' : 'danger'} role="none" size="sm">
                {shownResult.message ??
                  (shownResult.ok ? labels.connected : labels.connectionFailed)}
              </Alert>
            ) : null}
          </div>
        </div>
      ) : null}

      <FormActions submitLabel={labels.submit} onCancel={onCancel} />
    </>
  );
}

/**
 * A form for connecting a provider: which provider, the API key (masked, never prefilled, and
 * optional while one is already saved), an address for self-hosted providers, and a button to test
 * the connection. It stores nothing and contacts nobody: `onSubmit` and `onTestConnection` are
 * yours, and should talk to your server rather than keep keys in the browser.
 */
export const APIKeyForm = forwardRef(function APIKeyForm(
  {
    providers,
    defaultValues,
    hasStoredKey = false,
    onSubmit,
    onTestConnection,
    onCancel,
    schema,
    disabled,
    error,
    className,
    labels: labelsProp,
  }: APIKeyFormProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultApiKeyLabels, ...labelsProp };
  const defaultSchema = useMemo(
    () =>
      createApiKeySchema({ providers, hasStoredKey }) as unknown as z.ZodType<
        ApiKeyValues,
        FieldValues
      >,
    [providers, hasStoredKey],
  );

  return (
    <Form<FieldValues, ApiKeyValues>
      ref={ref}
      className={['axon-api-key', className].filter(Boolean).join(' ')}
      schema={schema ?? defaultSchema}
      defaultValues={{
        provider: providers[0]?.id ?? '',
        baseUrl: '',
        ...defaultValues,
        apiKey: '',
      }}
      onSubmit={onSubmit}
      formError={error}
      disabled={disabled}
    >
      <Body
        providers={providers}
        hasStoredKey={hasStoredKey}
        labels={labels}
        disabled={disabled}
        onTestConnection={onTestConnection}
        onCancel={onCancel}
      />
    </Form>
  );
});
