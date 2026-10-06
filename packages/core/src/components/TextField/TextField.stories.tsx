import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextField } from './TextField';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;
const types = ['text', 'email', 'password', 'number', 'search', 'tel', 'url'] as const;

const meta = {
  title: 'Core/TextField',
  component: TextField,
  parameters: { layout: 'padded' },
  argTypes: {
    type: { control: 'select', options: types },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: { control: 'select', options: colors },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    clearable: { control: 'boolean' },
    showCount: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    startAdornment: { control: false },
    endAdornment: { control: false },
  },
  args: { label: 'Email', placeholder: 'you@example.com', helperText: "We'll never share it." },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 22rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' } as const;

export const Playground: Story = { args: { fullWidth: true } };

export const Variants: Story = {
  render: () => (
    <div style={stack}>
      <TextField label="Outline" variant="outline" placeholder="Outline" fullWidth />
      <TextField label="Filled" variant="filled" placeholder="Filled" fullWidth />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      <TextField label="Small" size="sm" placeholder="Small" fullWidth />
      <TextField label="Medium" size="md" placeholder="Medium" fullWidth />
      <TextField label="Large" size="lg" placeholder="Large" fullWidth />
    </div>
  ),
};

export const Colors: Story = {
  name: 'Focus colors',
  render: () => (
    <div style={stack}>
      {colors.map((color) => (
        <TextField key={color} label={color} color={color} defaultValue="Focus me" fullWidth />
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={stack}>
      <TextField label="Required" required helperText="This field is required" fullWidth />
      <TextField
        label="With error"
        error
        errorMessage="Enter a valid email address"
        defaultValue="not-an-email"
        fullWidth
      />
      <TextField label="Disabled" disabled defaultValue="Can't edit" fullWidth />
      <TextField label="Read only" readOnly defaultValue="Read only value" fullWidth />
      <TextField label="Filled error" variant="filled" error errorMessage="Required" fullWidth />
    </div>
  ),
};

export const Adornments: Story = {
  render: () => (
    <div style={stack}>
      <TextField
        label="Price"
        type="number"
        startAdornment="$"
        endAdornment="USD"
        placeholder="0.00"
        fullWidth
      />
      <TextField
        label="Website"
        type="url"
        startAdornment="https://"
        placeholder="example.com"
        fullWidth
      />
    </div>
  ),
};

function ClearableDemo() {
  const [value, setValue] = useState('Clear me');
  return (
    <TextField
      label="Search"
      type="search"
      clearable
      value={value}
      onChange={(event) => setValue(event.target.value)}
      fullWidth
    />
  );
}

export const Clearable: Story = {
  render: () => <ClearableDemo />,
};

export const Password: Story = {
  render: () => <TextField label="Password" type="password" defaultValue="hunter2" fullWidth />,
};

export const CharacterCount: Story = {
  render: () => (
    <TextField
      label="Username"
      showCount
      maxLength={20}
      helperText="Letters and numbers only"
      defaultValue="axon"
      fullWidth
    />
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div style={stack}>
      {types.map((type) => (
        <TextField key={type} label={type} type={type} placeholder={type} fullWidth />
      ))}
    </div>
  ),
};
