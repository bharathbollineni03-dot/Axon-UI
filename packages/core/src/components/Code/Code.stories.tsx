import type { Meta, StoryObj } from '@storybook/react';
import { Code } from './Code';

const meta = {
  title: 'Layout/Code',
  component: Code,
  parameters: { layout: 'padded' },
  argTypes: { block: { control: 'boolean' }, language: { control: 'text' } },
  args: { children: 'pnpm add @axon/core' },
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: (args) => (
    <p style={{ fontFamily: 'var(--axon-font-sans)', color: 'var(--axon-color-text-primary)' }}>
      Install with <Code {...args} /> and import the styles.
    </p>
  ),
};

export const Block: Story = {
  args: {
    block: true,
    language: 'tsx',
    children: `import { Button } from '@axon/core';
import '@axon/core/styles.css';

export function App() {
  return <Button>Hello Axon</Button>;
}`,
  },
};

export const LongLinesScroll: Story = {
  args: {
    block: true,
    children:
      'const reallyLongLine = "this line is deliberately long so the block scrolls sideways and can be focused with the keyboard to scroll it";',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
};
