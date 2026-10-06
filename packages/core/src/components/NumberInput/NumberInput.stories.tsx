import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NumberInput, type NumberInputProps } from './NumberInput';

const meta = {
  title: 'Core/NumberInput',
  component: NumberInput,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    precision: { control: 'number' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    hideSteppers: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: { label: 'Quantity', defaultValue: 1, min: 0, max: 99 },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 14rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { fullWidth: true } };

export const StepAndRange: Story = {
  args: {
    label: 'Volume',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 50,
    helperText: 'Arrow keys step by 5; Shift+Arrow by 50; Home/End jump to the limits.',
    fullWidth: true,
  },
};

export const Precision: Story = {
  args: {
    label: 'Price',
    precision: 2,
    step: 0.25,
    min: 0,
    defaultValue: 9.5,
    helperText: 'Always shows two decimals.',
    fullWidth: true,
  },
};

function ControlledDemo(args: NumberInputProps) {
  const [value, setValue] = useState<number | null>(3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <NumberInput {...args} defaultValue={undefined} value={value} onChange={setValue} fullWidth />
      <button type="button" onClick={() => setValue(null)}>
        Clear (value = {String(value)})
      </button>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <NumberInput
        {...args}
        label="With error"
        error
        errorMessage="Must be at least 1"
        defaultValue={0}
        min={undefined}
        fullWidth
      />
      <NumberInput {...args} label="Disabled" disabled fullWidth />
      <NumberInput {...args} label="Read only" readOnly fullWidth />
      <NumberInput {...args} label="No steppers" hideSteppers fullWidth />
      <NumberInput {...args} label="Filled" variant="filled" fullWidth />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <NumberInput key={size} {...args} label={size} size={size} fullWidth />
      ))}
    </div>
  ),
};
