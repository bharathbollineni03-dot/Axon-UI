import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '../Box';
import { Divider } from '../Divider';
import { Stack } from './Stack';

const Item = ({ children }: { children: React.ReactNode }) => (
  <Box bg="muted" p={3} radius="md" bordered>
    {children}
  </Box>
);

const meta = {
  title: 'Layout/Stack',
  component: Stack,
  parameters: { layout: 'padded' },
  argTypes: {
    direction: {
      control: 'inline-radio',
      options: ['column', 'row', 'column-reverse', 'row-reverse'],
    },
    gap: { control: 'select', options: [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16] },
    align: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'between', 'around', 'evenly'],
    },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
    divider: { control: false },
  },
  args: {
    direction: 'row',
    gap: 3,
    children: [<Item key="1">One</Item>, <Item key="2">Two</Item>, <Item key="3">Three</Item>],
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Column: Story = { args: { direction: 'column', gap: 2 } };

export const Responsive: Story = {
  name: 'Responsive direction and gap',
  args: {
    direction: { base: 'column', md: 'row' },
    gap: { base: 2, md: 6 },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Stacks vertically on small screens and lays out in a row from 768px up. Resize the canvas to see it.',
      },
    },
  },
};

export const WithDividers: Story = {
  args: {
    direction: 'row',
    gap: 3,
    align: 'center',
    divider: <Divider orientation="vertical" flexItem />,
  },
};

export const Alignment: Story = {
  render: () => (
    <Stack gap={4}>
      {(['start', 'center', 'end', 'between'] as const).map((justify) => (
        <Stack
          key={justify}
          direction="row"
          gap={2}
          justify={justify}
          style={{
            border: '1px dashed var(--axon-color-border-strong)',
            padding: 'var(--axon-space-2)',
          }}
        >
          <Item>{justify}</Item>
          <Item>B</Item>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Wrapping: Story = {
  args: {
    direction: 'row',
    wrap: true,
    gap: 2,
    style: { maxWidth: '20rem' },
    children: Array.from({ length: 8 }, (_, i) => <Item key={i}>Item {i + 1}</Item>),
  },
};
