import type { Meta, StoryObj } from '@storybook/react';
import { SubmittedValues, useMockSubmit, type MockServer } from '../../stories/mock';
import {
  OTPVerificationForm,
  type OTPVerificationFormProps,
  type OTPVerificationValues,
} from './OTPVerificationForm';

const meta: Meta<OTPVerificationFormProps> = {
  title: 'Prebuilt forms/OTPVerificationForm',
  component: OTPVerificationForm as never,
  parameters: { layout: 'padded' },
  argTypes: {
    length: { control: { type: 'number', min: 4, max: 8 } },
    codeType: { control: 'inline-radio', options: ['numeric', 'alphanumeric', 'text'] },
    autoSubmit: { control: 'boolean' },
    autoFocus: { control: 'boolean' },
    resendCooldown: { control: { type: 'number', min: 3, max: 120 } },
    startCooldownOnMount: { control: 'boolean' },
    onSubmit: { control: false },
    onResend: { control: false },
  },
};
export default meta;
type Story = StoryObj<OTPVerificationFormProps>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Demo({
  server,
  failResend,
  ...props
}: Partial<OTPVerificationFormProps> & { server?: MockServer; failResend?: boolean }) {
  const { onSubmit, submitted } = useMockSubmit<OTPVerificationValues>(server);
  return (
    <>
      <OTPVerificationForm
        description="We sent a 6-digit code to a•••@example.com."
        {...props}
        onSubmit={onSubmit as OTPVerificationFormProps['onSubmit']}
        onResend={async () => {
          await sleep(700);
          if (failResend) throw new Error('Too many codes requested. Wait a few minutes.');
        }}
        resendCooldown={props.resendCooldown ?? 10}
      />
      <SubmittedValues values={submitted} />
    </>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const AutoSubmit: Story = {
  name: 'Submits when the last digit is typed',
  // eslint-disable-next-line jsx-a11y/no-autofocus -- a story about a page whose one job is this code
  render: () => <Demo autoSubmit autoFocus />,
};

export const WrongCode: Story = {
  name: 'Server error: wrong code',
  render: () => <Demo server={{ delay: 600, fieldErrors: { code: 'That code is not right.' } }} />,
};

export const ResendFails: Story = {
  name: 'Resend fails',
  render: () => <Demo failResend startCooldownOnMount={false} />,
};

export const FourDigits: Story = { render: () => <Demo length={4} autoSubmit /> };

export const LettersAndNumbers: Story = {
  render: () => (
    <Demo length={8} codeType="alphanumeric" description="Enter the 8-character recovery code." />
  ),
};

export const NoResend: Story = {
  render: () => (
    <OTPVerificationForm
      description="Open your authenticator app and enter the current code."
      onSubmit={() => {}}
    />
  ),
};
