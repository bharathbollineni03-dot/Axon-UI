import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from './Kbd';

const meta = {
  title: 'Layout/Kbd',
  component: Kbd,
  parameters: { layout: 'padded' },
  args: { children: 'Esc' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleKey: Story = {};

export const Shortcut: Story = { args: { children: undefined, keys: ['Ctrl', 'Shift', 'P'] } };

export const InText: Story = {
  render: () => (
    <p style={{ fontFamily: 'var(--axon-font-sans)', color: 'var(--axon-color-text-primary)' }}>
      Press <Kbd>Esc</Kbd> to close, or <Kbd keys={['Ctrl', 'K']} /> to search.
    </p>
  ),
};
