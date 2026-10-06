import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from './Radio';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Core/Radio',
  component: Radio,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: { value: 'standalone', label: 'A standalone radio' },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' } as const;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Radio name="states" value="1" label="Unselected" />
      <Radio name="states" value="2" label="Selected" defaultChecked />
      <Radio name="states" value="3" label="Disabled" disabled />
      <Radio name="other" value="4" label="Disabled selected" disabled defaultChecked />
      <Radio name="err" value="5" label="Error" error />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={stack}>
      {colors.map((color) => (
        <Radio
          key={color}
          name={`c-${color}`}
          value={color}
          color={color}
          label={color}
          defaultChecked
        />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Radio
          key={size}
          name={`s-${size}`}
          value={size}
          size={size}
          label={`Size ${size}`}
          defaultChecked
        />
      ))}
    </div>
  ),
};

export const WithDescription: Story = {
  args: { label: 'Pro plan', description: '$10 per user per month, billed annually.' },
};
