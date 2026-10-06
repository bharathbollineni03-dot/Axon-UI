import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '../Box';
import { Container } from './Container';

const meta = {
  title: 'Layout/Container',
  component: Container,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    maxWidth: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl', '2xl', 'full'] },
    gutter: { control: 'select', options: [0, 2, 4, 6, 8] },
    disableCenter: { control: 'boolean' },
  },
  args: { maxWidth: 'md' },
  render: (args) => (
    <Container {...args}>
      <Box bg="muted" p={4} radius="md" bordered>
        Content limited to the <strong>{args.maxWidth}</strong> breakpoint width and centered.
      </Box>
    </Container>
  ),
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      {(['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const).map((size) => (
        <Container key={size} maxWidth={size}>
          <Box bg="muted" p={3} radius="md" bordered>
            {size}
          </Box>
        </Container>
      ))}
    </div>
  ),
};

export const NotCentered: Story = { args: { disableCenter: true } };
