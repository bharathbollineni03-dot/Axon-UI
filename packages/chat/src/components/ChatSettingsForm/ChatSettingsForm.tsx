import { forwardRef, useMemo, type ReactNode, type Ref } from 'react';
import { Button, type SelectProps } from '@axon/core';
import {
  Form,
  FormActions,
  FormNumberInput,
  FormSelect,
  FormSlider,
  FormSwitch,
  z,
  type FieldValues,
  type FormProps,
} from '@axon/forms';
import { groupModels } from '../../internal/groupModels';
import type { ChatModel } from '../ModelSelector/ModelSelector';

// ---------------------------------------------------------------------------------------------
// Schema

export interface ChatSettingsMessages {
  modelRequired: string;
  temperatureRange: (min: number, max: number) => string;
  topPRange: string;
  maxTokensRequired: string;
  maxTokensWhole: string;
  maxTokensRange: (min: number, max: number) => string;
}

export const defaultChatSettingsMessages: ChatSettingsMessages = {
  modelRequired: 'Choose a model.',
  temperatureRange: (min, max) => `Temperature must be between ${min} and ${max}.`,
  topPRange: 'Top P must be between 0 and 1.',
  maxTokensRequired: 'Enter the most tokens a reply may use.',
  maxTokensWhole: 'Use a whole number of tokens.',
  maxTokensRange: (min, max) => `Use between ${min} and ${max} tokens.`,
};

export interface ChatSettingsSchemaOptions {
  messages?: Partial<ChatSettingsMessages>;
  /** The range of temperature. Defaults to 0 to 2. */
  temperature?: { min?: number; max?: number };
  /** The range of tokens in a reply. Defaults to 1 to 128,000. */
  maxTokens?: { min?: number; max?: number };
}

/** Builds the settings schema, for other limits or translated messages. */
export function createChatSettingsSchema({
  messages,
  temperature = {},
  maxTokens = {},
}: ChatSettingsSchemaOptions = {}) {
  const text = { ...defaultChatSettingsMessages, ...messages };
  const temperatureMin = temperature.min ?? 0;
  const temperatureMax = temperature.max ?? 2;
  const tokensMin = maxTokens.min ?? 1;
  const tokensMax = maxTokens.max ?? 128_000;
  return z.object({
    model: z.string({ error: text.modelRequired }).min(1, text.modelRequired),
    temperature: z
      .number()
      .min(temperatureMin, text.temperatureRange(temperatureMin, temperatureMax))
      .max(temperatureMax, text.temperatureRange(temperatureMin, temperatureMax)),
    topP: z.number().min(0, text.topPRange).max(1, text.topPRange),
    maxTokens: z
      .number({ error: text.maxTokensRequired })
      .int(text.maxTokensWhole)
      .min(tokensMin, text.maxTokensRange(tokensMin, tokensMax))
      .max(tokensMax, text.maxTokensRange(tokensMin, tokensMax)),
    stream: z.boolean(),
  });
}

export const chatSettingsSchema = createChatSettingsSchema();

/** What `ChatSettingsForm` submits. */
export type ChatSettingsValues = z.infer<typeof chatSettingsSchema>;

/** The values a new form starts with, except `model`, which defaults to the first model. */
export const defaultChatSettings: ChatSettingsValues = {
  model: '',
  temperature: 0.7,
  topP: 1,
  maxTokens: 1024,
  stream: true,
};

// ---------------------------------------------------------------------------------------------
// Labels

export interface ChatSettingsLabels {
  model: string;
  modelPlaceholder: string;
  temperature: string;
  temperatureHelp: string;
  topP: string;
  topPHelp: string;
  maxTokens: string;
  maxTokensHelp: string;
  stream: string;
  streamHelp: string;
  submit: string;
  reset: string;
}

export const defaultChatSettingsLabels: ChatSettingsLabels = {
  model: 'Model',
  modelPlaceholder: 'Choose a model',
  temperature: 'Temperature',
  temperatureHelp: 'Lower is focused and repeatable; higher is more varied and creative.',
  topP: 'Top P',
  topPHelp: 'Only consider the most likely words that add up to this share. Lower is safer.',
  maxTokens: 'Maximum reply length (tokens)',
  maxTokensHelp: 'A token is about three quarters of a word.',
  stream: 'Stream replies',
  streamHelp: 'Show the reply as it is written instead of all at once.',
  submit: 'Save settings',
  reset: 'Reset to defaults',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ChatSettingsFormProps {
  models: readonly ChatModel[];
  /** Starting values. Anything left out uses `defaultChatSettings`, and the first model. */
  defaultValues?: Partial<ChatSettingsValues>;
  /** Called with the validated settings. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: FormProps<FieldValues, ChatSettingsValues>['onSubmit'];
  onCancel?: () => void;
  /** Shows a button that puts every field back to its starting value. Defaults to true. */
  showReset?: boolean;
  /** Step and range of the temperature slider. Its limits are also checked. */
  temperature?: { min?: number; max?: number; step?: number };
  /** Step and range of the reply length. Its limits are also checked. */
  maxTokens?: { min?: number; max?: number; step?: number };
  /** Replaces the schema. Start from `createChatSettingsSchema()` and extend it with `.safeExtend()`. */
  schema?: FormProps<FieldValues, ChatSettingsValues>['schema'];
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  /** Extra fields, placed after the built-in ones. */
  children?: ReactNode;
  className?: string;
  labels?: Partial<ChatSettingsLabels>;
}

/**
 * A form for how the assistant answers: the model, temperature, top P, reply length and whether
 * replies stream. It does not save anything; `onSubmit` receives the values.
 */
export const ChatSettingsForm = forwardRef(function ChatSettingsForm(
  {
    models,
    defaultValues,
    onSubmit,
    onCancel,
    showReset = true,
    temperature,
    maxTokens,
    schema,
    disabled,
    error,
    children,
    className,
    labels: labelsProp,
  }: ChatSettingsFormProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultChatSettingsLabels, ...labelsProp };
  const temperatureMin = temperature?.min ?? 0;
  const temperatureMax = temperature?.max ?? 2;
  const tokensMin = maxTokens?.min ?? 1;
  const tokensMax = maxTokens?.max ?? 128_000;
  const initial = useMemo<ChatSettingsValues>(
    () => ({
      ...defaultChatSettings,
      model: models[0]?.id ?? '',
      ...defaultValues,
    }),
    [models, defaultValues],
  );
  const defaultSchema = useMemo(
    () =>
      createChatSettingsSchema({
        temperature: { min: temperatureMin, max: temperatureMax },
        maxTokens: { min: tokensMin, max: tokensMax },
      }) as unknown as NonNullable<FormProps<FieldValues, ChatSettingsValues>['schema']>,
    [temperatureMin, temperatureMax, tokensMin, tokensMax],
  );
  const options = useMemo(() => {
    const result: SelectProps['options'] = [];
    for (const group of groupModels(models)) {
      const items = group.models.map((model) => ({
        value: model.id,
        label: model.name,
        description: model.description,
        disabled: model.disabled,
      }));
      if (group.name) result.push({ label: group.name, options: items });
      else result.push(...items);
    }
    return result;
  }, [models]);

  return (
    <Form<FieldValues, ChatSettingsValues>
      ref={ref}
      className={['axon-chat-settings', className].filter(Boolean).join(' ')}
      schema={schema ?? defaultSchema}
      defaultValues={initial}
      onSubmit={onSubmit}
      formError={error}
      disabled={disabled}
    >
      {(form) => (
        <>
          <FormSelect
            name="model"
            label={labels.model}
            placeholder={labels.modelPlaceholder}
            options={options}
            fullWidth
            required
          />
          <FormSlider
            name="temperature"
            label={labels.temperature}
            helperText={labels.temperatureHelp}
            min={temperatureMin}
            max={temperatureMax}
            step={temperature?.step ?? 0.1}
            formatValue={(value) => value.toFixed(1)}
            showValue
          />
          <FormSlider
            name="topP"
            label={labels.topP}
            helperText={labels.topPHelp}
            min={0}
            max={1}
            step={0.05}
            formatValue={(value) => value.toFixed(2)}
            showValue
          />
          <FormNumberInput
            name="maxTokens"
            label={labels.maxTokens}
            helperText={labels.maxTokensHelp}
            min={tokensMin}
            max={tokensMax}
            step={maxTokens?.step ?? 256}
            fullWidth
            required
          />
          <FormSwitch name="stream" label={labels.stream} description={labels.streamHelp} />
          {children}
          <FormActions submitLabel={labels.submit} onCancel={onCancel}>
            {showReset ? (
              <Button type="button" variant="ghost" onClick={() => form.reset(initial)}>
                {labels.reset}
              </Button>
            ) : null}
          </FormActions>
        </>
      )}
    </Form>
  );
});
