import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MultiSelect, type MultiSelectProps } from './MultiSelect';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' },
  { value: 'angular', label: 'Angular', disabled: true },
  { value: 'lit', label: 'Lit', description: 'Web components' },
];

const meta = {
  title: 'Core/MultiSelect',
  component: MultiSelect,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    selectAll: { control: 'boolean' },
    clearable: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    options: { control: false },
    onChange: { action: 'changed' },
  },
  args: {
    label: 'Frameworks',
    options,
    placeholder: 'Select frameworks',
    helperText: 'Backspace removes the last one.',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 26rem)', minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithValues: Story = { args: { defaultValue: ['react', 'svelte'], clearable: true } };

export const SelectAll: Story = { args: { selectAll: true, defaultValue: ['vue'] } };

export const ManyChips: Story = {
  args: { defaultValue: ['react', 'vue', 'svelte', 'solid', 'lit'], clearable: true },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <ErrorExample {...args} />
      <MultiSelect {...args} label="Disabled" disabled defaultValue={['react', 'vue']} />
      <MultiSelect {...args} label="Filled" variant="filled" />
    </div>
  ),
};

function ErrorExample(args: MultiSelectProps) {
  return <MultiSelect {...args} label="Error" error errorMessage="Choose at least one" required />;
}

function ControlledDemo(args: MultiSelectProps) {
  const [value, setValue] = useState<string[]>(['vue']);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <MultiSelect {...args} value={value} onChange={setValue} />
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
