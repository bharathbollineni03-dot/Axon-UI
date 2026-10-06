import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';

const meta = {
  title: 'Core/Label',
  component: Label,
  args: { children: 'Email address', htmlFor: 'label-demo' },
  argTypes: {
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    hint: { control: 'text' },
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: '(optional)' } };

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-1-5)' }}>
      <Label {...args} />
      <input id={args.htmlFor} disabled placeholder="Disabled input" />
    </div>
  ),
};

export const WithInput: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-1-5)' }}>
      <Label {...args} />
      <input id={args.htmlFor} placeholder="Click the label to focus me" />
    </div>
  ),
};
