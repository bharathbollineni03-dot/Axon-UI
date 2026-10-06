import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Core/Switch',
  component: Switch,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    labelPosition: { control: 'inline-radio', options: ['start', 'end'] },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: { label: 'Enable notifications' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' } as const;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <div style={stack}>
      <Switch label="Off" />
      <Switch label="On" defaultChecked />
      <Switch label="Disabled" disabled />
      <Switch label="Disabled on" disabled defaultChecked />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={stack}>
      {colors.map((color) => (
        <Switch key={color} color={color} label={color} defaultChecked />
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Switch key={size} size={size} label={`Size ${size}`} defaultChecked />
      ))}
    </div>
  ),
};

export const LabelOnTheLeft: Story = {
  render: () => (
    <div style={{ ...stack, width: '20rem' }}>
      <Switch labelPosition="start" label="Dark mode" defaultChecked />
      <Switch labelPosition="start" label="Reduce motion" />
    </div>
  ),
};

export const WithDescription: Story = {
  args: { label: 'Marketing emails', description: 'Product news and offers, at most once a week.' },
};
