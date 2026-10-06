import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '../Box';
import { Grid, GridItem } from './Grid';

const Cell = ({ children }: { children: React.ReactNode }) => (
  <Box bg="muted" p={3} radius="md" bordered style={{ textAlign: 'center' }}>
    {children}
  </Box>
);

const meta = {
  title: 'Layout/Grid',
  component: Grid,
  parameters: { layout: 'padded' },
  argTypes: {
    columns: { control: 'number' },
    gap: { control: 'select', options: [0, 1, 2, 3, 4, 6, 8] },
  },
  args: { columns: 12, gap: 3 },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwelveColumns: Story = {
  render: (args) => (
    <Grid {...args}>
      <GridItem span={12}>
        <Cell>12</Cell>
      </GridItem>
      <GridItem span={6}>
        <Cell>6</Cell>
      </GridItem>
      <GridItem span={6}>
        <Cell>6</Cell>
      </GridItem>
      <GridItem span={4}>
        <Cell>4</Cell>
      </GridItem>
      <GridItem span={4}>
        <Cell>4</Cell>
      </GridItem>
      <GridItem span={4}>
        <Cell>4</Cell>
      </GridItem>
      <GridItem span={3}>
        <Cell>3</Cell>
      </GridItem>
      <GridItem span={9}>
        <Cell>9</Cell>
      </GridItem>
    </Grid>
  ),
};

export const ResponsiveSpans: Story = {
  name: 'Responsive spans',
  render: (args) => (
    <Grid {...args}>
      {Array.from({ length: 6 }, (_, i) => (
        <GridItem key={i} span={{ base: 12, sm: 6, lg: 4 }}>
          <Cell>{i + 1}</Cell>
        </GridItem>
      ))}
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full width on small screens, two across from 640px, three across from 1024px.',
      },
    },
  },
};

export const ResponsiveColumns: Story = {
  args: { columns: { base: 1, sm: 2, lg: 4 } },
  render: (args) => (
    <Grid {...args}>
      {Array.from({ length: 8 }, (_, i) => (
        <Cell key={i}>{i + 1}</Cell>
      ))}
    </Grid>
  ),
};

export const StartAndFullRow: Story = {
  render: (args) => (
    <Grid {...args}>
      <GridItem span="full">
        <Cell>full</Cell>
      </GridItem>
      <GridItem start={4} span={6}>
        <Cell>start 4, span 6</Cell>
      </GridItem>
      <GridItem start={2} span={3}>
        <Cell>start 2, span 3</Cell>
      </GridItem>
    </Grid>
  ),
};
