import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OTPInput, type OTPInputProps } from './OTPInput';

const meta = {
  title: 'Core/OTPInput',
  component: OTPInput,
  parameters: { layout: 'padded' },
  argTypes: {
    length: { control: { type: 'number', min: 2, max: 10 } },
    type: { control: 'inline-radio', options: ['numeric', 'alphanumeric', 'text'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    mask: { control: 'boolean' },
    autoFocus: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    onChange: { action: 'changed' },
    onComplete: { action: 'completed' },
  },
  args: {
    label: 'Verification code',
    helperText: 'Enter the 6-digit code we sent you. You can paste it.',
  },
} satisfies Meta<typeof OTPInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const FourDigitPin: Story = {
  args: { length: 4, mask: true, label: 'PIN', helperText: undefined },
};

export const Alphanumeric: Story = {
  args: { type: 'alphanumeric', length: 8, label: 'Recovery code', helperText: undefined },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <OTPInput key={size} {...args} size={size} label={`Size ${size}`} helperText={undefined} />
      ))}
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <OTPInput
        {...args}
        label="Error"
        error
        errorMessage="That code is not valid"
        defaultValue="123456"
      />
      <OTPInput {...args} label="Disabled" disabled defaultValue="123" helperText={undefined} />
      <OTPInput {...args} label="Read only" readOnly defaultValue="123456" helperText={undefined} />
    </div>
  ),
};

function VerifyDemo(args: OTPInputProps) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<'idle' | 'ok' | 'wrong'>('idle');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <OTPInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          setResult('idle');
        }}
        onComplete={(code) => setResult(code === '123456' ? 'ok' : 'wrong')}
        error={result === 'wrong'}
        errorMessage="That code is not valid. Try 123456."
        helperText={result === 'ok' ? 'Verified!' : 'Try 123456 for success.'}
      />
      <button type="button" onClick={() => setValue('')}>
        Reset
      </button>
    </div>
  );
}

export const VerifyOnComplete: Story = {
  render: (args) => <VerifyDemo {...args} />,
};
