import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, type RadioGroupProps } from './RadioGroup';

const options = [
  { value: 'free', label: 'Free', description: 'For personal projects' },
  { value: 'pro', label: 'Pro', description: 'For teams' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'legacy', label: 'Legacy (unavailable)', disabled: true },
];

const meta = {
  title: 'Core/RadioGroup',
  component: RadioGroup,
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
  args: { label: 'Plan', options, defaultValue: 'pro', helperText: 'Use the arrow keys to move.' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    options: options.slice(0, 3).map(({ description: _description, ...rest }) => rest),
  },
};

export const WithError: Story = {
  args: {
    defaultValue: undefined,
    required: true,
    error: true,
    errorMessage: 'Select a plan to continue.',
  },
};

export const Disabled: Story = { args: { disabled: true } };

function ControlledDemo(args: RadioGroupProps) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <RadioGroup {...args} value={value} onChange={setValue} />
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
