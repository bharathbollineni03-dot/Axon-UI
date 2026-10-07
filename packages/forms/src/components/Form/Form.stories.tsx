import type { Meta, StoryObj } from '@storybook/react';
import { z } from 'zod';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import { FormActions } from '../FormActions/FormActions';
import { FormTextField, FormTextArea } from '../FormBindings/FormBindings';
import { Form, type FormProps } from './Form';

const meta: Meta<FormProps> = {
  title: 'Forms/Form',
  component: Form as never,
  parameters: { layout: 'padded' },
  argTypes: {
    mode: { control: 'select', options: ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'] },
    reValidateMode: { control: 'inline-radio', options: ['onSubmit', 'onBlur', 'onChange'] },
    disabled: { control: 'boolean' },
    resetOnSuccess: { control: 'boolean' },
    onSubmit: { control: false },
    schema: { control: false },
    validate: { control: false },
    form: { control: false },
  },
};
export default meta;
type Story = StoryObj<FormProps>;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.'),
  email: z.string().min(1, 'Enter your email.').pipe(z.email('Enter a valid email.')),
  message: z.string().min(10, 'Write at least 10 characters.'),
});
type Values = z.infer<typeof schema>;

const wrapper = { maxWidth: '26rem' } as const;

function Demo({ server, ...props }: Partial<FormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<Values>(server);
  return (
    <div style={wrapper}>
      <Form
        schema={schema as never}
        defaultValues={{ name: '', email: '', message: '' }}
        {...props}
        onSubmit={onSubmit as unknown as FormProps['onSubmit']}
      >
        <FormTextField name="name" label="Name" fullWidth required />
        <FormTextField name="email" label="Email" type="email" fullWidth required />
        <FormTextArea name="message" label="Message" minRows={3} fullWidth required />
        <FormActions submitLabel="Send" />
      </Form>
      <SubmittedValues values={submitted} />
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const ValidateOnSubmitOnly: Story = {
  name: 'Validate on submit only (mode="onSubmit")',
  render: () => <Demo mode="onSubmit" />,
};

export const ValidateAsYouType: Story = {
  name: 'Validate as you type (mode="onChange")',
  render: () => <Demo mode="onChange" />,
};

export const ServerFieldError: Story = {
  name: 'Server error on a field',
  render: () => (
    <Demo
      server={{ delay: 600, fieldErrors: { email: 'That address bounced. Use another one.' } }}
    />
  ),
};

export const ServerFormError: Story = {
  name: 'Server error for the whole form',
  render: () => (
    <Demo server={{ delay: 600, formError: 'We are over capacity. Try again soon.' }} />
  ),
};

export const ThrownError: Story = {
  name: 'Thrown error shows in the banner',
  render: () => <Demo server={{ delay: 600, throws: 'The request timed out.' }} />,
};

export const ResetAfterSuccess: Story = {
  name: 'Reset after success',
  render: () => <Demo resetOnSuccess />,
};

export const Disabled: Story = { render: () => <Demo disabled /> };

/** Without a zod schema: a plain function returns the errors. It may be async. */
export const CustomValidator: Story = {
  name: 'Custom validator (no schema)',
  render: () => (
    <div style={wrapper}>
      <Form<{ username: string }>
        defaultValues={{ username: '' }}
        validate={async ({ username }) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (username.length < 3) return { username: 'Use at least 3 characters.' };
          if (username === 'admin') return { username: 'That name is taken.' };
          return undefined;
        }}
        onSubmit={() => new Promise((resolve) => setTimeout(resolve, 600))}
      >
        <FormTextField name="username" label="Username" helperText="Try “admin”." fullWidth />
        <FormActions submitLabel="Check" />
      </Form>
    </div>
  ),
};
