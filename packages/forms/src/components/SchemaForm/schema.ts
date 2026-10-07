import type { ReactNode } from 'react';
import { z } from 'zod';

export type SchemaFormValues = Record<string, unknown>;

/** A choice for `select`, `radio`, `multiselect` and `checkboxes` fields. */
export interface SchemaFieldOption {
  value: string;
  /** Plain text, because a select uses it for typeahead and its trigger. */
  label: string;
  description?: string;
  disabled?: boolean;
}

interface BaseField {
  /** The field's name in the values. Nested fields use dots: `"address.city"`. */
  name: string;
  label?: ReactNode;
  helperText?: ReactNode;
  /** The field must have a value (for a checkbox or switch: be on). */
  required?: boolean;
  disabled?: boolean;
  /** The value the field starts with. */
  defaultValue?: unknown;
  /** Columns the field spans from the `sm` breakpoint up, or `'full'` for the whole row. */
  span?: number | 'full';
  /**
   * Hides the field while this is `true` or returns `true` for the current values. A hidden field
   * is not validated and its value is left out of what `onSubmit` receives.
   */
  hidden?: boolean | ((values: SchemaFormValues) => boolean);
}

export interface TextSchemaField extends BaseField {
  type: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  /** A regular expression the whole value must match, as a string: `"^[a-z0-9_]+$"`. */
  pattern?: string;
  /** Shown when `pattern` does not match. */
  patternMessage?: string;
}

export interface TextAreaSchemaField extends BaseField {
  type: 'textarea';
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
}

export interface NumberSchemaField extends BaseField {
  type: 'number';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface SingleChoiceSchemaField extends BaseField {
  type: 'select' | 'radio';
  options: SchemaFieldOption[];
  placeholder?: string;
}

export interface MultiChoiceSchemaField extends BaseField {
  type: 'multiselect' | 'checkboxes';
  options: SchemaFieldOption[];
  placeholder?: string;
  minItems?: number;
  maxItems?: number;
}

export interface BooleanSchemaField extends BaseField {
  type: 'checkbox' | 'switch';
  /** Text under the label. */
  description?: ReactNode;
}

export interface DateSchemaField extends BaseField {
  type: 'date';
  min?: Date;
  max?: Date;
}

export interface TimeSchemaField extends BaseField {
  type: 'time';
  /** 24-hour `"HH:mm"`. */
  min?: string;
  max?: string;
}

export interface FileSchemaField extends BaseField {
  type: 'file';
  accept?: string;
  /** Largest file, in bytes. */
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  hint?: ReactNode;
}

export interface OTPSchemaField extends BaseField {
  type: 'otp';
  length?: number;
}

/** A titled group of fields. It has no value of its own. */
export interface SectionSchemaField {
  type: 'section';
  title: ReactNode;
  description?: ReactNode;
  fields: SchemaFormField[];
  span?: number | 'full';
  hidden?: boolean | ((values: SchemaFormValues) => boolean);
}

export type SchemaFieldConfig =
  | TextSchemaField
  | TextAreaSchemaField
  | NumberSchemaField
  | SingleChoiceSchemaField
  | MultiChoiceSchemaField
  | BooleanSchemaField
  | DateSchemaField
  | TimeSchemaField
  | FileSchemaField
  | OTPSchemaField;

/** One entry of a `SchemaForm`'s `fields`. */
export type SchemaFormField = SchemaFieldConfig | SectionSchemaField;

/** The validation messages the generated schema uses. Replace any of them to translate. */
export interface SchemaFormMessages {
  required: string;
  email: string;
  url: string;
  pattern: string;
  number: string;
  minLength: (min: number) => string;
  maxLength: (max: number) => string;
  min: (min: number) => string;
  max: (max: number) => string;
  minItems: (min: number) => string;
  maxItems: (max: number) => string;
  maxFiles: (max: number) => string;
  maxSize: (bytes: number) => string;
  otpLength: (length: number) => string;
  dateMin: (min: Date) => string;
  dateMax: (max: Date) => string;
  timeMin: (min: string) => string;
  timeMax: (max: string) => string;
}

export const defaultSchemaFormMessages: SchemaFormMessages = {
  required: 'This field is required.',
  email: 'Enter a valid email address.',
  url: 'Enter a valid URL.',
  pattern: 'This value is not in the right format.',
  number: 'Enter a number.',
  minLength: (min) => `Use at least ${min} characters.`,
  maxLength: (max) => `Use at most ${max} characters.`,
  min: (min) => `Enter ${min} or more.`,
  max: (max) => `Enter ${max} or less.`,
  minItems: (min) => `Choose at least ${min}.`,
  maxItems: (max) => `Choose at most ${max}.`,
  maxFiles: (max) => `Add at most ${max} files.`,
  maxSize: (bytes) => `Each file must be ${formatBytes(bytes)} or smaller.`,
  otpLength: (length) => `Enter all ${length} characters.`,
  dateMin: (min) => `Choose ${min.toLocaleDateString('en-US')} or later.`,
  dateMax: (max) => `Choose ${max.toLocaleDateString('en-US')} or earlier.`,
  timeMin: (min) => `Choose ${min} or later.`,
  timeMax: (max) => `Choose ${max} or earlier.`,
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Number((bytes / 1024).toFixed(1))} KB`;
  return `${bytes} bytes`;
}

// ---------------------------------------------------------------------------------------------
// Helpers over the config

/** The fields that hold a value, with sections flattened out. */
export function flattenFields(fields: SchemaFormField[]): SchemaFieldConfig[] {
  return fields.flatMap((field) =>
    field.type === 'section' ? flattenFields(field.fields) : [field],
  );
}

/** Reads `a.b.c` from nested values. */
export function getPath(values: unknown, path: string): unknown {
  let current: unknown = values;
  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Sets `a.b.c` in nested values, creating the objects on the way. */
export function setPath(values: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = values;
  keys.slice(0, -1).forEach((key) => {
    const existing = current[key];
    if (typeof existing !== 'object' || existing === null) current[key] = {};
    current = current[key] as Record<string, unknown>;
  });
  current[keys[keys.length - 1]!] = value;
}

/** What a field holds before the user touches it. */
export function emptyValue(field: SchemaFieldConfig): unknown {
  switch (field.type) {
    case 'number':
    case 'select':
    case 'radio':
    case 'date':
    case 'time':
      return null;
    case 'multiselect':
    case 'checkboxes':
    case 'file':
      return [];
    case 'checkbox':
    case 'switch':
      return false;
    default:
      return '';
  }
}

/** The starting values for the fields: each field's `defaultValue`, or an empty one. */
export function defaultValuesFromFields(fields: SchemaFormField[]): SchemaFormValues {
  const values: SchemaFormValues = {};
  for (const field of flattenFields(fields)) {
    setPath(values, field.name, field.defaultValue ?? emptyValue(field));
  }
  return values;
}

const isHidden = (
  field: { hidden?: SchemaFieldConfig['hidden'] },
  values: SchemaFormValues,
): boolean => (typeof field.hidden === 'function' ? field.hidden(values) : Boolean(field.hidden));

/** Whether `field` is hidden, taking the sections around it into account. */
function hiddenInContext(
  fields: SchemaFormField[],
  target: SchemaFieldConfig,
  values: SchemaFormValues,
): boolean {
  for (const field of fields) {
    if (field.type === 'section') {
      const inside = flattenFields(field.fields).includes(target);
      if (inside) return isHidden(field, values) || hiddenInContext(field.fields, target, values);
    } else if (field === target) {
      return isHidden(field, values);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Validation

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isEmptyString = (value: unknown) => typeof value !== 'string' || value.trim() === '';

/**
 * The first problem with a field's value, or `undefined` when it is valid. An empty optional
 * field is always valid; the other rules apply once there is something to check.
 */
export function validateField(
  field: SchemaFieldConfig,
  value: unknown,
  messages: SchemaFormMessages = defaultSchemaFormMessages,
): string | undefined {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'url':
    case 'search':
    case 'textarea': {
      if (isEmptyString(value)) return field.required ? messages.required : undefined;
      const text = value as string;
      if (field.type === 'email' && !emailPattern.test(text)) return messages.email;
      if (field.type === 'url' && !isUrl(text)) return messages.url;
      if (field.minLength !== undefined && text.length < field.minLength)
        return messages.minLength(field.minLength);
      if (field.maxLength !== undefined && text.length > field.maxLength)
        return messages.maxLength(field.maxLength);
      if (
        field.type !== 'textarea' &&
        field.pattern &&
        !new RegExp(`^(?:${field.pattern})$`).test(text)
      )
        return field.patternMessage ?? messages.pattern;
      return undefined;
    }
    case 'number': {
      if (value === null || value === undefined || value === '')
        return field.required ? messages.required : undefined;
      if (typeof value !== 'number' || Number.isNaN(value)) return messages.number;
      if (field.min !== undefined && value < field.min) return messages.min(field.min);
      if (field.max !== undefined && value > field.max) return messages.max(field.max);
      return undefined;
    }
    case 'select':
    case 'radio':
      return field.required && isEmptyString(value) ? messages.required : undefined;
    case 'multiselect':
    case 'checkboxes': {
      const items = Array.isArray(value) ? value : [];
      if (items.length === 0) return field.required ? messages.required : undefined;
      if (field.minItems !== undefined && items.length < field.minItems)
        return messages.minItems(field.minItems);
      if (field.maxItems !== undefined && items.length > field.maxItems)
        return messages.maxItems(field.maxItems);
      return undefined;
    }
    case 'checkbox':
    case 'switch':
      return field.required && value !== true ? messages.required : undefined;
    case 'date': {
      if (!(value instanceof Date)) return field.required ? messages.required : undefined;
      if (field.min && value < field.min) return messages.dateMin(field.min);
      if (field.max && value > field.max) return messages.dateMax(field.max);
      return undefined;
    }
    case 'time': {
      if (isEmptyString(value)) return field.required ? messages.required : undefined;
      // "HH:mm" strings compare correctly as text.
      if (field.min && (value as string) < field.min) return messages.timeMin(field.min);
      if (field.max && (value as string) > field.max) return messages.timeMax(field.max);
      return undefined;
    }
    case 'file': {
      const files = Array.isArray(value) ? (value as File[]) : [];
      if (files.length === 0) return field.required ? messages.required : undefined;
      if (field.maxFiles !== undefined && files.length > field.maxFiles)
        return messages.maxFiles(field.maxFiles);
      if (field.maxSize !== undefined && files.some((file) => file.size > field.maxSize!))
        return messages.maxSize(field.maxSize);
      return undefined;
    }
    case 'otp': {
      const code = typeof value === 'string' ? value : '';
      if (code === '') return field.required ? messages.required : undefined;
      if (field.length !== undefined && code.length < field.length)
        return messages.otpLength(field.length);
      return undefined;
    }
  }
}

/**
 * A zod schema generated from the field config, which is what `SchemaForm` validates with.
 * Hidden fields are skipped and left out of the parsed output. Exported so you can extend it
 * with `.refine()` and pass it back as `schema`.
 */
export function createSchemaFromFields(
  fields: SchemaFormField[],
  messages: Partial<SchemaFormMessages> = {},
) {
  const text = { ...defaultSchemaFormMessages, ...messages };
  const leaves = flattenFields(fields);

  return z
    .record(z.string(), z.unknown())
    .superRefine((values, ctx) => {
      for (const field of leaves) {
        if (hiddenInContext(fields, field, values)) continue;
        const message = validateField(field, getPath(values, field.name), text);
        if (message) ctx.addIssue({ code: 'custom', message, path: field.name.split('.') });
      }
    })
    .transform((values) => {
      const output = structuredCloneValues(values);
      for (const field of leaves) {
        if (hiddenInContext(fields, field, values)) deletePath(output, field.name);
      }
      return output;
    });
}

/** A shallow-per-level copy, so removing hidden values never touches the form's own state. */
function structuredCloneValues(values: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    copy[key] =
      value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
        ? structuredCloneValues(value as Record<string, unknown>)
        : value;
  }
  return copy;
}

function deletePath(values: Record<string, unknown>, path: string): void {
  const keys = path.split('.');
  let current: unknown = values;
  for (const key of keys.slice(0, -1)) {
    if (typeof current !== 'object' || current === null) return;
    current = (current as Record<string, unknown>)[key];
  }
  if (typeof current === 'object' && current !== null) {
    delete (current as Record<string, unknown>)[keys[keys.length - 1]!];
  }
}
