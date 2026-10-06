import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Select, type SelectItem, type SelectProps } from './Select';

const countries: SelectItem[] = [
  { value: 'ar', label: 'Argentina' },
  { value: 'au', label: 'Australia' },
  { value: 'br', label: 'Brazil' },
  { value: 'ca', label: 'Canada' },
  { value: 'de', label: 'Germany', description: 'Deutschland' },
  { value: 'in', label: 'India' },
  { value: 'jp', label: 'Japan' },
  { value: 'xx', label: 'Atlantis (unavailable)', disabled: true },
];

const grouped: SelectItem[] = [
  {
    label: 'Fruit',
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'cherry', label: 'Cherry', disabled: true },
    ],
  },
  {
    label: 'Vegetables',
    options: [
      { value: 'carrot', label: 'Carrot' },
      { value: 'leek', label: 'Leek' },
    ],
  },
];

const meta = {
  title: 'Core/Select',
  component: Select,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    options: { control: false },
    onChange: { action: 'changed' },
  },
  args: {
    label: 'Country',
    options: countries,
    placeholder: 'Select a country',
    helperText: 'Use the arrow keys or type to jump.',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 22rem)', minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Grouped: Story = {
  args: { options: grouped, label: 'Food', placeholder: 'Pick one' },
};

export const WithValue: Story = { args: { defaultValue: 'jp' } };

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <Select {...args} label="Required" required helperText="This field is required" />
      <Select {...args} label="Error" error errorMessage="Choose a country" />
      <Select {...args} label="Disabled" disabled defaultValue="de" />
      <Select {...args} label="Filled" variant="filled" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Select key={size} {...args} size={size} label={`Size ${size}`} />
      ))}
    </div>
  ),
};

function ControlledDemo(args: SelectProps) {
  const [value, setValue] = useState<string | null>('ca');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <Select {...args} value={value} onChange={setValue} />
      <button type="button" onClick={() => setValue('br')}>
        Set to Brazil (value = {String(value)})
      </button>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
