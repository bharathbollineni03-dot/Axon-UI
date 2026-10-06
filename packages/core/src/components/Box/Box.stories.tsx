import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';

const meta = {
  title: 'Layout/Box',
  component: Box,
  parameters: { layout: 'padded' },
  argTypes: {
    p: { control: 'select', options: [undefined, 0, 1, 2, 3, 4, 6, 8, 12] },
    m: { control: 'select', options: [undefined, 0, 1, 2, 3, 4, 6, 8, 12] },
    bg: {
      control: 'inline-radio',
      options: [undefined, 'background', 'surface', 'raised', 'muted'],
    },
    radius: { control: 'select', options: [undefined, 'none', 'sm', 'md', 'lg', 'xl', 'full'] },
    shadow: { control: 'inline-radio', options: [undefined, 'sm', 'md', 'lg', 'xl'] },
    bordered: { control: 'boolean' },
    as: { control: 'text' },
  },
  args: { p: 4, bg: 'muted', radius: 'md', children: 'A box with theme-token styling.' },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Surfaces: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', maxWidth: '24rem' }}>
      {(['background', 'surface', 'raised', 'muted'] as const).map((bg) => (
        <Box key={bg} bg={bg} p={4} radius="md" bordered>
          {`bg="${bg}"`}
        </Box>
      ))}
    </div>
  ),
};

export const Shadows: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-6)', flexWrap: 'wrap' }}>
      {(['sm', 'md', 'lg', 'xl'] as const).map((shadow) => (
        <Box key={shadow} shadow={shadow} bg="raised" p={6} radius="lg">
          {shadow}
        </Box>
      ))}
    </div>
  ),
};

export const AsAnotherElement: Story = {
  render: () => (
    <Box as="section" aria-label="Notes" p={4} bg="muted" radius="md">
      Rendered as a <code>&lt;section&gt;</code>, so it becomes a landmark.
    </Box>
  ),
};
