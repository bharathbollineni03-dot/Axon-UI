import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Button, ConfirmDialog, Select, TextField } from '@axon/core';
import {
  Form,
  FormActions,
  FormTextArea,
  useFormContext,
  useWatch,
  z,
  type FieldValues,
  type FormHelpers,
  type FormSubmitResult,
} from '@axon/forms';

// ---------------------------------------------------------------------------------------------
// Schema

export interface SystemPromptMessages {
  promptRequired: string;
  promptTooLong: (max: number) => string;
}

export const defaultSystemPromptMessages: SystemPromptMessages = {
  promptRequired: 'Write the instructions the assistant should follow.',
  promptTooLong: (max) => `Keep the instructions to ${max} characters or fewer.`,
};

export interface SystemPromptSchemaOptions {
  messages?: Partial<SystemPromptMessages>;
  /** Longest prompt, in characters. Defaults to 8000. */
  maxLength?: number;
  /** Does not allow an empty prompt. Defaults to false: no system prompt is a valid choice. */
  required?: boolean;
}

/** Builds the schema, for another limit or translated messages. */
export function createSystemPromptSchema({
  messages,
  maxLength = 8000,
  required = false,
}: SystemPromptSchemaOptions = {}) {
  const text = { ...defaultSystemPromptMessages, ...messages };
  const prompt = z.string().max(maxLength, text.promptTooLong(maxLength));
  return z.object({
    prompt: required ? prompt.trim().min(1, text.promptRequired) : prompt,
  });
}

export const systemPromptSchema = createSystemPromptSchema();

// ---------------------------------------------------------------------------------------------
// Types and labels

export interface SystemPromptPreset {
  id: string;
  name: string;
  prompt: string;
  /** A line under the name in the preset list. */
  description?: string;
}

/** What `SystemPromptEditor` submits. `presetId` is the preset whose text is exactly the prompt. */
export interface SystemPromptValues {
  prompt: string;
  presetId: string | null;
}

export interface SystemPromptLabels {
  prompt: string;
  preset: string;
  presetPlaceholder: string;
  savePreset: string;
  presetName: string;
  presetNameRequired: string;
  presetNameTaken: string;
  presetSaved: string;
  presetSaveError: string;
  confirmSave: string;
  cancelSave: string;
  deletePreset: string;
  deleteTitle: string;
  deleteDescription: (name: string) => string;
  deleteConfirm: string;
  deleteCancel: string;
  deleteError: string;
  submit: string;
}

export const defaultSystemPromptLabels: SystemPromptLabels = {
  prompt: 'System prompt',
  preset: 'Preset',
  presetPlaceholder: 'Custom',
  savePreset: 'Save as preset…',
  presetName: 'Preset name',
  presetNameRequired: 'Enter a name for the preset.',
  presetNameTaken: 'A preset with this name already exists.',
  presetSaved: 'Preset saved.',
  presetSaveError: 'The preset could not be saved. Try again.',
  confirmSave: 'Save preset',
  cancelSave: 'Cancel',
  deletePreset: 'Delete preset',
  deleteTitle: 'Delete this preset?',
  deleteDescription: (name) => `“${name}” will be removed from your presets.`,
  deleteConfirm: 'Delete',
  deleteCancel: 'Cancel',
  deleteError: 'The preset could not be deleted. Try again.',
  submit: 'Save prompt',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface SystemPromptEditorProps {
  /** Saved prompts people can start from. */
  presets?: readonly SystemPromptPreset[];
  /** The text to start with. Defaults to an empty prompt. */
  defaultPrompt?: string;
  /** Called with the prompt. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: (
    values: SystemPromptValues,
    helpers: FormHelpers<FieldValues, { prompt: string }>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  onCancel?: () => void;
  /** Shows "Save as preset…". Resolve when saved; reject to show an error. */
  onSavePreset?: (preset: { name: string; prompt: string }) => void | Promise<unknown>;
  /** Shows "Delete preset" while a preset is in use. Resolve when deleted; reject to show an error. */
  onDeletePreset?: (preset: SystemPromptPreset) => void | Promise<unknown>;
  /** Longest prompt, in characters. Defaults to 8000. */
  maxLength?: number;
  /** Does not allow an empty prompt. Defaults to false. */
  required?: boolean;
  /** Replaces the schema. Start from `createSystemPromptSchema()`. */
  schema?: z.ZodType<{ prompt: string }, FieldValues>;
  /** Rows of the text box at the start. Defaults to 8. */
  minRows?: number;
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  className?: string;
  labels?: Partial<SystemPromptLabels>;
}

interface BodyProps {
  presets: readonly SystemPromptPreset[];
  labels: SystemPromptLabels;
  maxLength: number;
  minRows: number;
  disabled?: boolean;
  onCancel?: () => void;
  onSavePreset?: SystemPromptEditorProps['onSavePreset'];
  onDeletePreset?: SystemPromptEditorProps['onDeletePreset'];
}

function SavePresetRow({
  labels,
  taken,
  onSave,
  onCancel,
}: {
  labels: SystemPromptLabels;
  taken: (name: string) => boolean;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError(labels.presetNameRequired);
    if (taken(trimmed)) return setError(labels.presetNameTaken);
    setError(null);
    setBusy(true);
    try {
      await onSave(trimmed);
    } catch {
      setError(labels.presetSaveError);
    } finally {
      setBusy(false);
    }
  };

  // Enter here saves the preset; it must not submit the whole form.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <div role="group" aria-label={labels.savePreset} className="axon-system-prompt__save">
      <TextField
        ref={inputRef}
        label={labels.presetName}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        error={Boolean(error)}
        errorMessage={error ?? undefined}
        disabled={busy}
        fullWidth
      />
      <div className="axon-system-prompt__save-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          {labels.cancelSave}
        </Button>
        <Button type="button" onClick={save} loading={busy}>
          {labels.confirmSave}
        </Button>
      </div>
    </div>
  );
}

function EditorBody({
  presets,
  labels,
  maxLength,
  minRows,
  disabled,
  onCancel,
  onSavePreset,
  onDeletePreset,
}: BodyProps) {
  const { setValue, control } = useFormContext();
  const prompt = (useWatch({ control, name: 'prompt' }) as string | undefined) ?? '';
  const activePreset = presets.find((preset) => preset.prompt === prompt);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<SystemPromptPreset | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  const options = useMemo(
    () =>
      presets.map((preset) => ({
        value: preset.id,
        label: preset.name,
        description: preset.description,
      })),
    [presets],
  );

  const choose = (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setNotice('');
    setDeleteError(false);
    setValue('prompt', preset.prompt, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const isTaken = (name: string) =>
    presets.some((preset) => preset.name.trim().toLowerCase() === name.toLowerCase());

  return (
    <>
      {presets.length ? (
        <Select
          label={labels.preset}
          placeholder={labels.presetPlaceholder}
          options={options}
          value={activePreset?.id ?? null}
          onChange={choose}
          disabled={disabled}
          fullWidth
        />
      ) : null}

      <FormTextArea
        name="prompt"
        label={labels.prompt}
        minRows={minRows}
        maxLength={maxLength}
        showCount
        autoResize
        fullWidth
      />

      {onSavePreset || (onDeletePreset && activePreset) ? (
        <div className="axon-system-prompt__tools">
          {onSavePreset && !saving ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !prompt.trim() || Boolean(activePreset)}
              onClick={() => {
                setNotice('');
                setSaving(true);
              }}
            >
              {labels.savePreset}
            </Button>
          ) : null}
          {onDeletePreset && activePreset ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              color="danger"
              disabled={disabled}
              onClick={() => {
                setDeleteError(false);
                setDeleting(activePreset);
              }}
            >
              {labels.deletePreset}
            </Button>
          ) : null}
        </div>
      ) : null}

      {saving && onSavePreset ? (
        <SavePresetRow
          labels={labels}
          taken={isTaken}
          onCancel={() => setSaving(false)}
          onSave={async (name) => {
            await onSavePreset({ name, prompt });
            setSaving(false);
            setNotice(labels.presetSaved);
          }}
        />
      ) : null}

      <span className="axon-visually-hidden" role="status">
        {notice}
      </span>

      <FormActions submitLabel={labels.submit} onCancel={onCancel} />

      {onDeletePreset ? (
        <ConfirmDialog
          open={deleting !== null}
          color="danger"
          title={labels.deleteTitle}
          description={deleting ? labels.deleteDescription(deleting.name) : undefined}
          confirmLabel={labels.deleteConfirm}
          cancelLabel={labels.deleteCancel}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            if (!deleting) return;
            try {
              await onDeletePreset(deleting);
              setDeleting(null);
            } catch {
              setDeleteError(true);
              setDeleting(null);
            }
          }}
        />
      ) : null}
      {deleteError ? (
        <p role="alert" className="axon-system-prompt__error">
          {labels.deleteError}
        </p>
      ) : null}
    </>
  );
}

/**
 * A text box for the assistant's standing instructions, with presets: pick one to fill the box,
 * and save the current text as a new one. It stores nothing itself: `onSubmit`, `onSavePreset`
 * and `onDeletePreset` are yours.
 */
export const SystemPromptEditor = forwardRef(function SystemPromptEditor(
  {
    presets = [],
    defaultPrompt = '',
    onSubmit,
    onCancel,
    onSavePreset,
    onDeletePreset,
    maxLength = 8000,
    required = false,
    schema,
    minRows = 8,
    disabled,
    error,
    className,
    labels: labelsProp,
  }: SystemPromptEditorProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultSystemPromptLabels, ...labelsProp };
  const defaultSchema = useMemo(
    () =>
      createSystemPromptSchema({ maxLength, required }) as unknown as z.ZodType<
        { prompt: string },
        FieldValues
      >,
    [maxLength, required],
  );

  return (
    <Form<FieldValues, { prompt: string }>
      ref={ref}
      className={['axon-system-prompt', className].filter(Boolean).join(' ')}
      schema={schema ?? defaultSchema}
      defaultValues={{ prompt: defaultPrompt }}
      onSubmit={(values, helpers) =>
        onSubmit(
          {
            prompt: values.prompt,
            presetId: presets.find((preset) => preset.prompt === values.prompt)?.id ?? null,
          },
          helpers,
        )
      }
      formError={error}
      disabled={disabled}
    >
      <EditorBody
        presets={presets}
        labels={labels}
        maxLength={maxLength}
        minRows={minRows}
        disabled={disabled}
        onCancel={onCancel}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
      />
    </Form>
  );
});
