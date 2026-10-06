import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxGroup, type CheckboxGroupProps } from './CheckboxGroup';

const options = [
  { value: 'email', label: 'Email', description: 'Receive updates in your inbox' },
  { value: 'sms', label: 'SMS' },
  { value: 'push', label: 'Push notifications' },
  { value: 'mail', label: 'Postal mail', disabled: true },
];

const meta = {
  title: 'Core/CheckboxGroup',
  component: CheckboxGroup,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: {
    label: 'Notify me by',
    options,
    defaultValue: ['email'],
    helperText: 'Choose any that apply.',
  },
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };

export const WithError: Story = {
  args: {
    defaultValue: [],
    required: true,
    error: true,
    errorMessage: 'Choose at least one option.',
  },
};

export const Disabled: Story = { args: { disabled: true } };

function ControlledDemo(args: CheckboxGroupProps) {
  const [value, setValue] = useState<string[]>(['sms']);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <CheckboxGroup {...args} value={value} onChange={setValue} />
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
