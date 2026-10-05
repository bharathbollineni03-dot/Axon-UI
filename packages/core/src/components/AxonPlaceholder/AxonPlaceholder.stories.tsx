import type { Meta, StoryObj } from '@storybook/react';
import { AxonPlaceholder } from './AxonPlaceholder';

const meta = {
  title: 'Core/AxonPlaceholder',
  component: AxonPlaceholder,
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    variant: { control: 'inline-radio', options: ['solid', 'outline'] },
  },
} satisfies Meta<typeof AxonPlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { children: 'Axon UI pipeline works' },
};

export const Colors: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)', flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const).map((c) => (
        <AxonPlaceholder key={c} {...args} color={c}>
          {c}
        </AxonPlaceholder>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-2)', alignItems: 'center' }}>
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <AxonPlaceholder key={s} {...args} size={s}>
          {s}
        </AxonPlaceholder>
      ))}
    </div>
  ),
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
};
