import { forwardRef, useMemo, type ReactElement, type Ref } from 'react';
import type { FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { requiredText } from '../../internal/validators';
import { FormAvatarUpload } from '../AvatarUpload/FormAvatarUpload';
import { PrebuiltFormShell, type PrebuiltFormProps } from '../AuthCard/PrebuiltFormShell';
import { FormActions } from '../FormActions/FormActions';
import { FormTextArea, FormTextField } from '../FormBindings/FormBindings';

// ---------------------------------------------------------------------------------------------
// Schema

export interface ProfileMessages {
  nameRequired: string;
  bioTooLong: (max: number) => string;
  avatarType: string;
  avatarSize: (maxBytes: number) => string;
}

export const defaultProfileMessages: ProfileMessages = {
  nameRequired: 'Enter your name.',
  bioTooLong: (max) => `Keep your bio to ${max} characters or fewer.`,
  avatarType: 'Choose an image file.',
  avatarSize: (maxBytes) => `Choose a picture under ${Math.round(maxBytes / 1024 / 1024)} MB.`,
};

export interface ProfileSchemaOptions {
  messages?: Partial<ProfileMessages>;
  /** Longest bio, in characters. Defaults to 160. */
  maxBioLength?: number;
  /** Largest picture, in bytes. Defaults to 2 MB. */
  maxAvatarSize?: number;
}

const isFileOrNull = (value: unknown): value is File | null =>
  value === null || value === undefined || (typeof File !== 'undefined' && value instanceof File);

/** Builds the profile schema, for other limits or translated messages. */
export function createProfileSchema({
  messages,
  maxBioLength = 160,
  maxAvatarSize = 2 * 1024 * 1024,
}: ProfileSchemaOptions = {}) {
  const text = { ...defaultProfileMessages, ...messages };
  return z.object({
    avatar: z.custom<File | null>(isFileOrNull, text.avatarType).superRefine((file, ctx) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        ctx.addIssue({ code: 'custom', message: text.avatarType });
      } else if (file.size > maxAvatarSize) {
        ctx.addIssue({ code: 'custom', message: text.avatarSize(maxAvatarSize) });
      }
    }),
    name: requiredText(text.nameRequired),
    bio: z.string().max(maxBioLength, text.bioTooLong(maxBioLength)),
  });
}

/** The default schema: an optional picture under 2 MB, a name, and a bio of up to 160 characters. */
export const profileSchema = createProfileSchema();

/** The values `ProfileForm` submits. `avatar` is the newly chosen picture, or `null`. */
export type ProfileValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------------------------
// Labels

export interface ProfileLabels {
  avatar: string;
  /** Help text under the picture; receives the size limit in bytes. */
  avatarHint: (maxBytes: number) => string;
  changePhoto: string;
  undoPhoto: string;
  removePhoto: string;
  name: string;
  bio: string;
  bioHint: string;
  submit: string;
  cancel: string;
}

export const defaultProfileLabels: ProfileLabels = {
  avatar: 'Profile photo',
  avatarHint: (maxBytes) => 'JPG, PNG or GIF, up to ' + Math.round(maxBytes / 1024 / 1024) + ' MB.',
  changePhoto: 'Change photo',
  undoPhoto: 'Undo',
  removePhoto: 'Remove photo',
  name: 'Name',
  bio: 'Bio',
  bioHint: 'A short line about you.',
  submit: 'Save changes',
  cancel: 'Cancel',
};

// ---------------------------------------------------------------------------------------------
// Component

export interface ProfileFormProps<
  TValues extends FieldValues = ProfileValues,
> extends PrebuiltFormProps<TValues> {
  labels?: Partial<ProfileLabels>;
  /** The user's current picture, shown until they pick a new one. */
  avatarUrl?: string;
  /** Shows a "Remove photo" button while there is an `avatarUrl`, and calls this. */
  onRemoveAvatar?: () => void;
  /** Longest bio, in characters. Defaults to 160. */
  maxBioLength?: number;
  /** Largest picture, in bytes. Defaults to 2 MB. */
  maxAvatarSize?: number;
  /** Shows a Cancel button that calls this. */
  onCancel?: () => void;
  /** Keeps the save button off until something has changed. */
  disableWhenPristine?: boolean;
}

function ProfileFormInner<TValues extends FieldValues = ProfileValues>(
  {
    labels: labelsProp,
    avatarUrl,
    onRemoveAvatar,
    maxBioLength = 160,
    maxAvatarSize = 2 * 1024 * 1024,
    onCancel,
    disableWhenPristine = false,
    schema,
    title = 'Your profile',
    headingLevel = 2,
    children,
    defaultValues,
    ...shell
  }: ProfileFormProps<TValues>,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultProfileLabels, ...labelsProp };
  const defaultSchema = useMemo(
    () =>
      createProfileSchema({ maxBioLength, maxAvatarSize }) as unknown as z.ZodType<
        TValues,
        FieldValues
      >,
    [maxBioLength, maxAvatarSize],
  );

  return (
    <PrebuiltFormShell<TValues>
      {...shell}
      title={title}
      headingLevel={headingLevel}
      formRef={ref}
      schema={schema}
      defaultSchema={defaultSchema}
      defaultValues={defaultValues}
      baseValues={{ avatar: null, name: '', bio: '' }}
    >
      <FormAvatarUpload
        name="avatar"
        label={labels.avatar}
        src={avatarUrl}
        fallbackName={String((defaultValues as { name?: unknown } | undefined)?.name ?? '')}
        changeLabel={labels.changePhoto}
        undoLabel={labels.undoPhoto}
        removeLabel={labels.removePhoto}
        onRemoveCurrent={onRemoveAvatar}
        helperText={labels.avatarHint(maxAvatarSize)}
      />
      <FormTextField name="name" label={labels.name} autoComplete="name" fullWidth required />
      <FormTextArea
        name="bio"
        label={labels.bio}
        helperText={labels.bioHint}
        maxLength={maxBioLength}
        showCount
        minRows={3}
        fullWidth
      />
      {children}
      <FormActions
        submitLabel={labels.submit}
        cancelLabel={labels.cancel}
        onCancel={onCancel}
        disableWhenPristine={disableWhenPristine}
      />
    </PrebuiltFormShell>
  );
}

/**
 * A profile editor: a picture (previewed locally), a name and a short bio. Nothing is uploaded
 * here: `onSubmit` receives `{ avatar, name, bio }`, where `avatar` is the newly chosen `File` or
 * `null`, and sends it wherever it belongs.
 */
export const ProfileForm = forwardRef(ProfileFormInner) as <
  TValues extends FieldValues = ProfileValues,
>(
  props: ProfileFormProps<TValues> & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
