import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '../Stack';
import { Divider } from './Divider';

const meta = {
  title: 'Layout/Divider',
  component: Divider,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    variant: { control: 'inline-radio', options: ['solid', 'dashed'] },
    decorative: { control: 'boolean' },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: '20rem' }}>
      <p>Above</p>
      <Divider {...args} />
      <p>Below</p>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ width: '20rem' }}>
      <Divider>or continue with</Divider>
    </div>
  ),
};

export const Dashed: Story = { args: { variant: 'dashed' }, render: Playground.render };

export const Vertical: Story = {
  render: () => (
    <Stack direction="row" gap={3} align="center" style={{ height: '2rem' }}>
      <span>Home</span>
      <Divider orientation="vertical" flexItem />
      <span>Docs</span>
      <Divider orientation="vertical" flexItem />
      <span>Blog</span>
    </Stack>
  ),
};
