import { forwardRef, useMemo, type ReactNode, type Ref, type ReactElement } from 'react';
import { useWatch } from 'react-hook-form';
import { Form, type FormProps } from '../Form/Form';
import {
  FormCheckbox,
  FormCheckboxGroup,
  FormDatePicker,
  FormFileUpload,
  FormMultiSelect,
  FormNumberInput,
  FormOTPInput,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTextArea,
  FormTextField,
  FormTimePicker,
} from '../FormBindings/FormBindings';
import { FormActions, type FormActionsProps } from '../FormActions/FormActions';
import { FormGrid, FormGridItem, type FormGridProps } from '../FormGrid/FormGrid';
import { FormSection } from '../FormSection/FormSection';
import {
  createSchemaFromFields,
  defaultValuesFromFields,
  type SchemaFieldConfig,
  type SchemaFormField,
  type SchemaFormMessages,
  type SchemaFormValues,
} from './schema';

export interface SchemaFormProps extends Omit<
  FormProps<SchemaFormValues>,
  'children' | 'form' | 'schema'
> {
  /**
   * The fields, as data. Define the array outside the component (or memoize it): the validation
   * schema is rebuilt whenever it changes.
   */
  fields: SchemaFormField[];
  /** Replaces the schema generated from `fields`, for rules the config cannot express. */
  schema?: FormProps<SchemaFormValues>['schema'];
  /** Replaces the validation messages of the generated schema, to translate them. */
  messages?: Partial<SchemaFormMessages>;
  /** Columns from the `sm` breakpoint up. Defaults to 1. */
  columns?: FormGridProps['columns'];
  submitLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onCancel?: () => void;
  /** Props for the actions row, such as `align` or `disableWhenPristine`. */
  actionsProps?: Omit<FormActionsProps, 'submitLabel' | 'cancelLabel' | 'onCancel'>;
  /** Replaces the actions row, or `false` to leave it out. */
  actions?: ReactNode | false;
}

/** Hides what is inside while the field's `hidden` setting says so. Watches the values for it. */
function HiddenGate({
  hidden,
  children,
}: {
  hidden: SchemaFieldConfig['hidden'];
  children: ReactNode;
}) {
  const values = useWatch() as SchemaFormValues;
  return typeof hidden === 'function' && hidden(values) ? null : <>{children}</>;
}

function renderLeaf(field: SchemaFieldConfig): ReactNode {
  const common = {
    name: field.name,
    label: field.label,
    helperText: field.helperText,
    required: field.required,
    disabled: field.disabled,
    fullWidth: true,
  };
  switch (field.type) {
    case 'textarea':
      return (
        <FormTextArea
          {...common}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          minRows={field.rows}
          showCount={field.maxLength !== undefined}
        />
      );
    case 'number':
      return (
        <FormNumberInput
          {...common}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    case 'select':
      return <FormSelect {...common} options={field.options} placeholder={field.placeholder} />;
    case 'multiselect':
      return (
        <FormMultiSelect {...common} options={field.options} placeholder={field.placeholder} />
      );
    case 'radio': {
      const { fullWidth: _fullWidth, ...rest } = common;
      return <FormRadioGroup {...rest} options={field.options} />;
    }
    case 'checkboxes': {
      const { fullWidth: _fullWidth, ...rest } = common;
      return <FormCheckboxGroup {...rest} options={field.options} />;
    }
    case 'checkbox':
      return (
        <FormCheckbox
          name={field.name}
          label={field.label}
          description={field.description ?? field.helperText}
          required={field.required}
          disabled={field.disabled}
        />
      );
    case 'switch':
      return (
        <FormSwitch
          name={field.name}
          label={field.label}
          description={field.description ?? field.helperText}
          disabled={field.disabled}
        />
      );
    case 'date':
      return <FormDatePicker {...common} min={field.min} max={field.max} />;
    case 'time':
      return <FormTimePicker {...common} min={field.min} max={field.max} />;
    case 'file':
      return (
        <FormFileUpload
          {...common}
          accept={field.accept}
          maxSize={field.maxSize}
          maxFiles={field.maxFiles}
          multiple={field.multiple}
          hint={field.hint}
        />
      );
    case 'otp': {
      const { fullWidth: _fullWidth, ...rest } = common;
      return <FormOTPInput {...rest} length={field.length} />;
    }
    default:
      return (
        <FormTextField
          {...common}
          type={field.type}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          maxLength={field.maxLength}
          showCount={false}
        />
      );
  }
}

function renderField(field: SchemaFormField, key: string, columns: SchemaFormProps['columns']) {
  const hidden = field.hidden;
  const node =
    field.type === 'section' ? (
      <FormSection title={field.title} description={field.description}>
        <FormGrid columns={columns}>
          {field.fields.map((child, i) => renderField(child, `${key}.${i}`, columns))}
        </FormGrid>
      </FormSection>
    ) : (
      renderLeaf(field)
    );
  const gated =
    typeof hidden === 'function' ? (
      <HiddenGate hidden={hidden}>{node}</HiddenGate>
    ) : hidden ? null : (
      node
    );
  if (gated === null) return null;
  const fallbackSpan = field.type === 'section' ? 'full' : 1;
  return (
    <FormGridItem key={key} span={field.span ?? fallbackSpan}>
      {gated}
    </FormGridItem>
  );
}

function SchemaFormInner(props: SchemaFormProps, ref: Ref<HTMLFormElement>) {
  const {
    fields,
    schema,
    messages,
    columns = 1,
    defaultValues,
    submitLabel,
    cancelLabel,
    onCancel,
    actionsProps,
    actions,
    ...formProps
  } = props;

  const generated = useMemo(() => createSchemaFromFields(fields, messages), [fields, messages]);
  const initial = useMemo(
    () => ({ ...defaultValuesFromFields(fields), ...(defaultValues as SchemaFormValues) }),
    [fields, defaultValues],
  );

  return (
    <Form<SchemaFormValues>
      {...formProps}
      ref={ref}
      schema={schema ?? (generated as FormProps<SchemaFormValues>['schema'])}
      defaultValues={initial}
    >
      <FormGrid columns={columns}>
        {fields.map((field, index) => renderField(field, String(index), columns))}
      </FormGrid>
      {actions === false
        ? null
        : (actions ?? (
            <FormActions
              {...actionsProps}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              onCancel={onCancel}
            />
          ))}
    </Form>
  );
}

/**
 * Renders a form from a JSON-like config. Each entry in `fields` becomes the matching binding
 * (text, select, date, file, ...); `section` entries group fields. A validation schema is
 * generated from the same config (`required`, `minLength`, `pattern`, ...), and `hidden` can
 * depend on other fields' values. Pass your own `schema` for anything the config cannot say.
 */
export const SchemaForm = forwardRef(SchemaFormInner) as (
  props: SchemaFormProps & { ref?: Ref<HTMLFormElement> },
) => ReactElement;
