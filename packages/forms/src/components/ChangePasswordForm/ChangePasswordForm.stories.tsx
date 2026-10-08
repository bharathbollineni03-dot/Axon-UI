import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import {
  ChangePasswordForm,
  type ChangePasswordFormProps,
  type ChangePasswordValues,
} from './ChangePasswordForm';

const meta: Meta<ChangePasswordFormProps> = {
  title: 'Prebuilt forms/ChangePasswordForm',
  component: ChangePasswordForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    showPasswordStrength: { control: 'boolean' },
    disallowSamePassword: { control: 'boolean' },
    headingLevel: { control: 'inline-radio', options: [1, 2, 3] },
    card: { control: 'boolean' },
    onSubmit: { control: false },
  },
};
export default meta;
type Story = StoryObj<ChangePasswordFormProps>;

function Demo({ server, ...props }: Partial<ChangePasswordFormProps> & { server?: MockServer }) {
  const { onSubmit, submitted } = useMockSubmit<ChangePasswordValues>(server);
  return (
    <>
      <ChangePasswordForm {...props} onSubmit={onSubmit as ChangePasswordFormProps['onSubmit']} />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const WrongCurrentPassword: Story = {
  name: 'Server error on a field',
  render: () => (
    <Demo
      server={{
        delay: 600,
        fieldErrors: { currentPassword: 'That is not your current password.' },
      }}
    />
  ),
};

export const RecentlyUsed: Story = {
  name: 'Server error for the whole form',
  render: () => (
    <Demo server={{ delay: 600, formError: 'You used that password recently. Choose another.' }} />
  ),
};

export const InASettingsPage: Story = {
  name: 'Without a card, inside a page',
  render: () => (
    <div style={{ maxWidth: '28rem' }}>
      <Demo
        card={false}
        headingLevel={3}
        title="Password"
        description="Change it every so often."
      />
    </div>
  ),
};
