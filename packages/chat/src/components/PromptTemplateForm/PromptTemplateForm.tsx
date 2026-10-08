import { forwardRef, useMemo, type ReactNode, type Ref } from 'react';
import {
  Form,
  FormActions,
  FormSubmitError,
  FormTextArea,
  FormTextField,
  useFormContext,
  useWatch,
  z,
  type FieldValues,
  type FormHelpers,
  type FormSubmitErrors,
  type FormSubmitResult,
} from '@axonui/forms';
import { extractTemplateVariables, humanizeVariableName, renderPromptTemplate } from './templates';

export interface TemplateVariableConfig {
  /** The field's label. Defaults to the variable's name, made readable. */
  label?: string;
  /** Text under the field. */
  description?: string;
  placeholder?: string;
  /** Uses a text area instead of a single line. */
  multiline?: boolean;
  defaultValue?: string;
  /** Whether the field must be filled in. Defaults to true. */
  required?: boolean;
}

export interface PromptTemplateMessages {
  required: (label: string) => string;
}

export const defaultPromptTemplateMessages: PromptTemplateMessages = {
  required: (label) => `Enter ${label.toLowerCase()}.`,
};

export interface PromptTemplateLabels {
  submit: string;
  preview: string;
  previewEmpty: string;
  noVariables: string;
}

export const defaultPromptTemplateLabels: PromptTemplateLabels = {
  submit: 'Use prompt',
  preview: 'Preview',
  previewEmpty: 'The prompt appears here as you fill in the fields.',
  noVariables: 'This template has no variables. It is used as written.',
};

/** What `PromptTemplateForm` submits: the answers by variable name, and the finished prompt. */
export interface PromptTemplateValues {
  values: Record<string, string>;
  prompt: string;
}

export interface PromptTemplateFormProps {
  /** The prompt, with `{{variable}}` placeholders. A field is made for each one. */
  template: string;
  /** Settings for variables, by name. Variables not listed get a field with a readable label. */
  variables?: Record<string, TemplateVariableConfig>;
  /** Called with the answers and the finished prompt. Return `{ fieldErrors, formError }` or throw to show server errors. */
  onSubmit: (
    result: PromptTemplateValues,
    helpers: FormHelpers<FieldValues, FieldValues>,
  ) => FormSubmitResult | Promise<FormSubmitResult>;
  onCancel?: () => void;
  /** Shows the prompt as it will be sent, updated as people type. Defaults to true. */
  showPreview?: boolean;
  disabled?: boolean;
  /** An error for the banner above the fields. */
  error?: ReactNode;
  className?: string;
  messages?: Partial<PromptTemplateMessages>;
  labels?: Partial<PromptTemplateLabels>;
}

interface Field {
  /** The variable's name in the template. */
  name: string;
  /** The name of the form field. Variable names can contain dots, which form libraries read as nesting. */
  field: string;
  config: TemplateVariableConfig;
  label: string;
}

function Preview({
  template,
  fields,
  labels,
}: {
  template: string;
  fields: Field[];
  labels: PromptTemplateLabels;
}) {
  const { control } = useFormContext();
  const raw = (useWatch({ control }) as Record<string, string | undefined>) ?? {};
  const values = Object.fromEntries(fields.map((item) => [item.name, raw[item.field]]));
  const filled = fields.some((item) => (raw[item.field] ?? '').trim() !== '');
  return (
    <section className="axon-prompt-template__preview" aria-label={labels.preview}>
      <h3 className="axon-prompt-template__preview-title">{labels.preview}</h3>
      {filled || fields.length === 0 ? (
        <p className="axon-prompt-template__preview-text">
          {renderPromptTemplate(template, values)}
        </p>
      ) : (
        <p className="axon-prompt-template__preview-empty">{labels.previewEmpty}</p>
      )}
    </section>
  );
}

/**
 * A form made from a prompt template: each `{{variable}}` becomes a field, and a preview shows
 * the finished prompt as it is filled in. `onSubmit` receives the answers and the final text.
 */
export const PromptTemplateForm = forwardRef(function PromptTemplateForm(
  {
    template,
    variables,
    onSubmit,
    onCancel,
    showPreview = true,
    disabled,
    error,
    className,
    messages: messagesProp,
    labels: labelsProp,
  }: PromptTemplateFormProps,
  ref: Ref<HTMLFormElement>,
) {
  const labels = { ...defaultPromptTemplateLabels, ...labelsProp };
  const requiredMessage = messagesProp?.required ?? defaultPromptTemplateMessages.required;

  // Parents often pass `variables` inline, so key the memo on its content, not its identity.
  const signature = JSON.stringify(variables ?? {});
  const fields = useMemo<Field[]>(() => {
    const config = JSON.parse(signature) as Record<string, TemplateVariableConfig>;
    return extractTemplateVariables(template).map((name, index) => ({
      name,
      field: `variable_${index}`,
      config: config[name] ?? {},
      label: config[name]?.label ?? humanizeVariableName(name),
    }));
  }, [template, signature]);

  const schema = useMemo(
    () =>
      z.object(
        Object.fromEntries(
          fields.map((item) => {
            const text = z.string().trim();
            return [
              item.field,
              item.config.required === false ? text : text.min(1, requiredMessage(item.label)),
            ];
          }),
        ),
      ) as unknown as z.ZodType<Record<string, string>, FieldValues>,
    // `requiredMessage` is read when the fields change; a new function each render must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields],
  );

  const toField = (name: string) => fields.find((item) => item.name === name)?.field ?? name;
  const mapFieldErrors = (errors: NonNullable<FormSubmitErrors['fieldErrors']>) =>
    Object.fromEntries(Object.entries(errors).map(([name, message]) => [toField(name), message]));

  const defaultValues = useMemo(
    () => Object.fromEntries(fields.map((item) => [item.field, item.config.defaultValue ?? ''])),
    [fields],
  );

  return (
    <Form<FieldValues, Record<string, string>>
      // A different template is a different form: start again rather than carry answers over.
      key={template}
      ref={ref}
      className={['axon-prompt-template', className].filter(Boolean).join(' ')}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async (raw, helpers) => {
        const values = Object.fromEntries(fields.map((item) => [item.name, raw[item.field] ?? '']));
        try {
          const result = await onSubmit(
            { values, prompt: renderPromptTemplate(template, values, { missing: 'empty' }) },
            { ...helpers, setError: (name, message) => helpers.setError(toField(name), message) },
          );
          return result && result.fieldErrors
            ? { ...result, fieldErrors: mapFieldErrors(result.fieldErrors) }
            : result;
        } catch (caught) {
          // Errors you throw name variables; the form knows its fields by another name.
          if (caught instanceof FormSubmitError && caught.fieldErrors) {
            throw new FormSubmitError({
              formError: caught.formError,
              fieldErrors: mapFieldErrors(caught.fieldErrors),
            });
          }
          throw caught;
        }
      }}
      formError={error}
      disabled={disabled}
    >
      {fields.length === 0 ? (
        <p className="axon-prompt-template__note">{labels.noVariables}</p>
      ) : null}
      {fields.map((item) =>
        item.config.multiline ? (
          <FormTextArea
            key={item.field}
            name={item.field}
            label={item.label}
            helperText={item.config.description}
            placeholder={item.config.placeholder}
            required={item.config.required !== false}
            minRows={3}
            autoResize
            fullWidth
          />
        ) : (
          <FormTextField
            key={item.field}
            name={item.field}
            label={item.label}
            helperText={item.config.description}
            placeholder={item.config.placeholder}
            required={item.config.required !== false}
            fullWidth
          />
        ),
      )}
      {showPreview ? <Preview template={template} fields={fields} labels={labels} /> : null}
      <FormActions submitLabel={labels.submit} onCancel={onCancel} />
    </Form>
  );
});
