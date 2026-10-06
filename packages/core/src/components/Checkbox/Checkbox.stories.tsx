import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox, type CheckboxProps } from './Checkbox';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Core/Checkbox',
  component: Checkbox,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    indeterminate: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: { label: 'Accept the terms and conditions' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' } as const;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Checkbox label="Unchecked" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled checked" disabled defaultChecked />
      <Checkbox label="Error" error />
      <Checkbox label="Error checked" error defaultChecked />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={stack}>
      {colors.map((color) => (
        <Checkbox key={color} color={color} label={color} defaultChecked />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Checkbox key={size} size={size} label={`Size ${size}`} defaultChecked />
      ))}
    </div>
  ),
};

export const WithDescription: Story = {
  args: {
    label: 'Marketing emails',
    description: 'Product news and offers, at most once a week.',
  },
};

function SelectAllDemo(args: CheckboxProps) {
  const [items, setItems] = useState({ a: true, b: false, c: true });
  const values = Object.values(items);
  const all = values.every(Boolean);
  const none = values.every((v) => !v);
  return (
    <div style={stack}>
      <Checkbox
        {...args}
        label="Select all"
        checked={all}
        indeterminate={!all && !none}
        onChange={(event) =>
          setItems({ a: event.target.checked, b: event.target.checked, c: event.target.checked })
        }
      />
      <div style={{ ...stack, paddingInlineStart: 'var(--axon-space-6)' }}>
        {(['a', 'b', 'c'] as const).map((key) => (
          <Checkbox
            key={key}
            label={`Item ${key.toUpperCase()}`}
            checked={items[key]}
            onChange={(event) => setItems({ ...items, [key]: event.target.checked })}
          />
        ))}
      </div>
    </div>
  );
}

export const SelectAll: Story = {
  render: (args) => <SelectAllDemo {...args} />,
};
