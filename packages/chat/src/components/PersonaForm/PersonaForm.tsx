import { forwardRef, useMemo, useState, type ReactNode, type Ref } from 'react';
import {
  Form,
  FormActions,
  FormAvatarUpload,
  FormSection,
  FormSelect,
  FormTextArea,
  FormTextField,
  useWatch,
  z,
  type FieldValues,
  type FormHelpers,
  type FormSubmitResult,
} from '@axonui/forms';

// ---------------------------------------------------------------------------------------------
// Schema

export interface PersonaMessages {
  nameRequired: string;
  nameTooLong: (max: number) => string;
  descriptionTooLong: (max: number) => string;
  greetingTooLong: (max: number) => string;
  instructionsTooLong: (max: number) => string;
  tooManyPrompts: (max: number) => string;
  promptTooLong: (max: number) => string;
  avatarType: string;
  avatarSize: (maxBytes: number) => string;
}

export const defaultPersonaMessages: PersonaMessages = {
  nameRequired: 'Give the assistant a name.',
  nameTooLong: (max) => `Keep the name to ${max} characters or fewer.`,
  descriptionTooLong: (max) => `Keep the description to ${max} characters or fewer.`,
  greetingTooLong: (max) => `Keep the greeting to ${max} characters or fewer.`,
  instructionsTooLong: (max) => `Keep the instructions to ${max} characters or fewer.`,
  tooManyPrompts: (max) => `Add at most ${max} starter prompts.`,
  promptTooLong: (max) => `Keep each starter prompt to ${max} characters or fewer.`,
  avatarType: 'Choose an image file.',
  avatarSize: (maxBytes) => `Choose a picture under ${Math.round(maxBytes / 1024 / 1024)} MB.`,
};

export interface PersonaSchemaOptions {
  messages?: Partial<PersonaMessages>;
  /** Most starter prompts. Defaults to 6. */
  maxStarterPrompts?: number;
  /** Longest instructions, in characters. Defaults to 4000. */
  maxInstructions?: number;
  /** Largest avatar, in bytes. Defaults to 2 MB. */
  maxAvatarSize?: number;
}

/** The lines of a text box, trimmed, with the empty ones left out. */
export function parseStarterPrompts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const isFileOrNull = (value: unknown): value is File | null =>
  value === null || (typeof File !== 'undefined' && value instanceof File);

/** Builds the persona schema, for other limits or translated messages. */
export function createPersonaSchema({
  messages,
  maxStarterPrompts = 6,
  maxInstructions = 4000,
  maxAvatarSize = 2 * 1024 * 1024,
}: PersonaSchemaOptions = {}) {
  const text = { ...defaultPersonaMessages, ...messages };
  const promptLimit = 120;
  return z.object({
    name: z.string().trim().min(1, text.nameRequired).max(60, text.nameTooLong(60)),
    avatar: z.custom<File | null>(isFileOrNull, text.avatarType).superRefine((file, ctx) => {
      if (file && !file.type.startsWith('image/')) {
        ctx.addIssue({ code: 'custom', message: text.avatarType });
      } else if (file && file.size > maxAvatarSize) {
        ctx.addIssue({ code: 'custom', message: text.avatarSize(maxAvatarSize) });
      }
    }),
    description: z.string().trim().max(200, text.descriptionTooLong(200)),
    tone: z.string().nullable(),
    greeting: z.string().trim().max(300, text.greetingTooLong(300)),
    instructions: z.string().trim().max(maxInstructions, text.instructionsTooLong(maxInstructions)),
    // One prompt per line in the box; the form submits the list.
    starterPrompts: z
      .string()
      .superRefine((value, ctx) => {
        const lines = parseStarterPrompts(value);
        if (lines.length > maxStarterPrompts) {
          ctx.addIssue({ code: 'custom', message: text.tooManyPrompts(maxStarterPrompts) });
        } else if (lines.some((line) => line.length > promptLimit)) {
          ctx.addIssue({ code: 'custom', message: text.promptTooLong(promptLimit) });
        }
      })
      .transform(parseStarterPrompts),
  });
}

export const personaSchema = createPersonaSchema();

/** What `PersonaForm` submits. `avatar` is the newly chosen picture, or `null`. */
export type PersonaValues = z.output<typeof personaSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface PersonaLabels {
  identity: string;
  behavior: string;
  avatar: string;
  name: string;
  description: string;
  descriptionHelp: string;
  tone: string;
  tonePlaceholder: string;
  greeting: string;
  greetingHelp: string;
  instructions: string;
  instructionsHelp: string;
  starterPrompts: string;
  starterPromptsHelp: (max: number) => string;
  submit: string;
}

export const defaultPersonaLabels: PersonaLabels = {
  identity: 'Identity',
  behavior: 'Behavior',
  avatar: 'Picture',
  name: 'Name',
  description: 'Description',
  descriptionHelp: 'A line shown under the name, such as what this assistant is for.',
  tone: 'Tone of voice',
  tonePlaceholder: 'No preference',
  greeting: 'Opening message',
  greetingHelp: 'What the assistant says when a chat starts.',
  instructions: 'Instructions',
  instructionsHelp: 'How the assistant should behave, and what it should and should not do.',
  starterPrompts: 'Starter prompts',
  starterPromptsHelp: (max) => `One per line, up to ${max}. Shown as suggestions in an empty chat.`,
  submit: 'Save assistant',
};

export const defaultPersonaTones = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'concise', label: 'Concise' },
  { value: 'playful', label: 'Playful' },
  { value: 'neutral', label: 'Neutral' },
];

// ---------------------------------------------------------------------------------------------
// Component

export interface PersonaFormProps {
  /**
   * Starting values, read once when the form mounts (give the form a `key` to start again).
   * `starterPrompts` is a list here, and one per line in the box.
   */
  defaultValues?: Partial<Omit<PersonaValues, 'avatar' | 'starterPrompts'>> & {
    starterPrompts?: string[];
  };
  /** The current picture, shown until a new one is chosen. */
  avatarUrl?: string;
  /** Shows a "Remove photo" button while there is a current picture. */
  onRemoveAvatar?: () => void;
  /** The choices for the tone of voice. Defaults to five common ones. */
  tones?: { value: string; label: string }[];
  /** Called with the validated values. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: (
    values: PersonaValues,
    helpers: FormHelpers<FieldValues, PersonaValues>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  onCancel?: () => void;
  /** Most starter prompts. Defaults to 6. */
  maxStarterPrompts?: number;
  /** Longest instructions, in characters. Defaults to 4000. */
  maxInstructions?: number;
  /** Replaces the schema. Start from `createPersonaSchema()` and extend it with `.safeExtend()`. */
  schema?: z.ZodType<PersonaValues, FieldValues>;
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  /** Extra fields, placed after the built-in ones. */
  children?: ReactNode;
  className?: string;
  labels?: Partial<PersonaLabels>;
}

function AvatarField({
  label,
  avatarUrl,
  onRemoveAvatar,
}: {
  label: string;
  avatarUrl?: string;
  onRemoveAvatar?: () => void;
}) {
  const name = (useWatch({ name: 'name' }) as string | undefined) ?? '';
  return (
    <FormAvatarUpload
      name="avatar"
      label={label}
      src={avatarUrl}
      fallbackName={name}
      onRemoveCurrent={onRemoveAvatar}
    />
  );
}

/**
 * A form for defining an assistant: a picture, name and description, a tone of voice, the opening
 * message, instructions and starter prompts. It stores nothing; `onSubmit` receives the values,
 * with the starter prompts as a list.
 */
export const PersonaForm = forwardRef(function PersonaForm(
  {
    defaultValues,
    avatarUrl,
    onRemoveAvatar,
    tones = defaultPersonaTones,
    onSubmit,
    onCancel,
    maxStarterPrompts = 6,
    maxInstructions = 4000,
    schema,
    disabled,
    error,
    children,
    className,
    labels: labelsProp,
  }: PersonaFormProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultPersonaLabels, ...labelsProp };
  const defaultSchema = useMemo(
    () =>
      createPersonaSchema({ maxStarterPrompts, maxInstructions }) as unknown as z.ZodType<
        PersonaValues,
        FieldValues
      >,
    [maxStarterPrompts, maxInstructions],
  );
  // The box holds text, so the list of prompts becomes one per line.
  const [initial] = useState(() => ({
    name: '',
    avatar: null,
    description: '',
    tone: null,
    greeting: '',
    instructions: '',
    ...defaultValues,
    starterPrompts: (defaultValues?.starterPrompts ?? []).join('\n'),
  }));

  return (
    <Form<FieldValues, PersonaValues>
      ref={ref}
      className={['axon-persona', className].filter(Boolean).join(' ')}
      schema={schema ?? defaultSchema}
      defaultValues={initial}
      onSubmit={onSubmit}
      formError={error}
      disabled={disabled}
    >
      <FormSection title={labels.identity}>
        <AvatarField label={labels.avatar} avatarUrl={avatarUrl} onRemoveAvatar={onRemoveAvatar} />
        <FormTextField name="name" label={labels.name} maxLength={60} fullWidth required />
        <FormTextArea
          name="description"
          label={labels.description}
          helperText={labels.descriptionHelp}
          maxLength={200}
          showCount
          minRows={2}
          fullWidth
        />
      </FormSection>
      <FormSection title={labels.behavior}>
        <FormSelect
          name="tone"
          label={labels.tone}
          placeholder={labels.tonePlaceholder}
          options={tones}
          fullWidth
        />
        <FormTextArea
          name="greeting"
          label={labels.greeting}
          helperText={labels.greetingHelp}
          maxLength={300}
          showCount
          minRows={2}
          fullWidth
        />
        <FormTextArea
          name="instructions"
          label={labels.instructions}
          helperText={labels.instructionsHelp}
          maxLength={maxInstructions}
          showCount
          minRows={5}
          autoResize
          fullWidth
        />
        <FormTextArea
          name="starterPrompts"
          label={labels.starterPrompts}
          helperText={labels.starterPromptsHelp(maxStarterPrompts)}
          minRows={3}
          autoResize
          fullWidth
        />
      </FormSection>
      {children}
      <FormActions submitLabel={labels.submit} onCancel={onCancel} />
    </Form>
  );
});
