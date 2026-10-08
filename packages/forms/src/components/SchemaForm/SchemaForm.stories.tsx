import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit } from '../../stories/mock';
import { SchemaForm, type SchemaFormProps } from './SchemaForm';
import type { SchemaFormField, SchemaFormValues } from './schema';

const meta: Meta<SchemaFormProps> = {
  title: 'Forms/SchemaForm',
  component: SchemaForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 4 } },
    fields: { control: 'object' },
    onSubmit: { control: false },
    actions: { control: false },
    schema: { control: false },
  },
};
export default meta;
type Story = StoryObj<SchemaFormProps>;

/** The whole form is this array: render, validation and conditional fields all come from it. */
const signUpFields: SchemaFormField[] = [
  {
    type: 'section',
    title: 'Account',
    description: 'How we reach you.',
    fields: [
      { type: 'text', name: 'name', label: 'Full name', required: true, autoComplete: 'name' },
      {
        type: 'email',
        name: 'email',
        label: 'Email',
        required: true,
        helperText: 'We never share it.',
        autoComplete: 'email',
      },
      {
        type: 'text',
        name: 'username',
        label: 'Username',
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: '[a-z0-9_]+',
        patternMessage: 'Use lowercase letters, numbers and underscores.',
      },
      { type: 'number', name: 'age', label: 'Age', min: 13, max: 120, helperText: 'Optional.' },
    ],
  },
  {
    type: 'section',
    title: 'Preferences',
    fields: [
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        required: true,
        placeholder: 'Choose a role',
        options: [
          { value: 'dev', label: 'Developer' },
          { value: 'design', label: 'Designer' },
          { value: 'pm', label: 'Product manager' },
          { value: 'other', label: 'Something else' },
        ],
      },
      {
        type: 'text',
        name: 'roleOther',
        label: 'Which role?',
        required: true,
        hidden: (values) => values['role'] !== 'other',
      },
      {
        type: 'checkboxes',
        name: 'interests',
        label: 'Interests',
        minItems: 1,
        required: true,
        options: [
          { value: 'ui', label: 'UI' },
          { value: 'ai', label: 'AI' },
          { value: 'data', label: 'Data' },
        ],
      },
      { type: 'switch', name: 'newsletter', label: 'Send me the newsletter', defaultValue: true },
      { type: 'textarea', name: 'about', label: 'About you', maxLength: 140, span: 'full' },
      {
        type: 'checkbox',
        name: 'terms',
        label: 'I accept the terms',
        required: true,
        span: 'full',
      },
    ],
  },
];

function Demo(props: Partial<SchemaFormProps>) {
  const { onSubmit, submitted } = useMockSubmit<SchemaFormValues>();
  return (
    <div style={{ maxWidth: props.columns && Number(props.columns) > 1 ? '48rem' : '28rem' }}>
      <SchemaForm
        fields={signUpFields}
        submitLabel="Create account"
        {...props}
        onSubmit={onSubmit as SchemaFormProps['onSubmit']}
      />
      <SubmittedValues values={submitted} />
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const TwoColumns: Story = { render: () => <Demo columns={2} /> };

export const ConditionalField: Story = {
  name: 'Conditional field: choose “Something else”',
  render: () => <Demo />,
};

export const Translated: Story = {
  render: () => (
    <Demo
      messages={{
        required: 'Este campo es obligatorio.',
        email: 'Escribe un correo válido.',
        minLength: (min) => `Usa al menos ${min} caracteres.`,
      }}
      submitLabel="Crear cuenta"
    />
  ),
};

export const ServerErrors: Story = {
  render: () => {
    const Inner = () => {
      const { onSubmit } = useMockSubmit<SchemaFormValues>({
        fieldErrors: { username: 'That username is taken.' },
      });
      return (
        <div style={{ maxWidth: '28rem' }}>
          <SchemaForm
            fields={signUpFields}
            submitLabel="Create account"
            onSubmit={onSubmit as SchemaFormProps['onSubmit']}
          />
        </div>
      );
    };
    return <Inner />;
  },
};
