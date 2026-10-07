import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import {
  ResetPasswordForm,
  type ResetPasswordFormProps,
  type ResetPasswordValues,
} from './ResetPasswordForm';

const meta: Meta<ResetPasswordFormProps> = {
  title: 'Prebuilt forms/ResetPasswordForm',
  component: ResetPasswordForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showPasswordStrength: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    onSubmit: { control: false },
  },
};
export default meta;
type Story = StoryObj<ResetPasswordFormProps>;

function Demo({ server, ...props }: Partial<ResetPasswordFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<ResetPasswordValues>(server);
  return (
    <>
      <ResetPasswordForm {...props} onSubmit={onSubmit as ResetPasswordFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const StrictRules: Story = {
  render: () => (
    <Demo
      passwordRules={{ minLength: 12, requireNumber: true, requireSymbol: true }}
      description="Use 12+ characters with a number and a symbol."
    />
  ),
};

export const ExpiredLink: Story = {
  name: 'Server error: the link expired',
  render: () => (
    <Demo server={{ delay: 600, formError: 'This reset link has expired. Request a new one.' }} />
  ),
};

export const WithoutMeter: Story = { render: () => <Demo showPasswordStrength={false} /> };
