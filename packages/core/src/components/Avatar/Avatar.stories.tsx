import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

/** A tiny inline portrait so stories work offline. */
const PORTRAIT =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='%23bfdbfe'/><circle cx='48' cy='38' r='18' fill='%231e3a8a'/><path d='M12 96c4-24 20-34 36-34s32 10 36 34Z' fill='%231e3a8a'/></svg>";

const meta = {
  title: 'Layout/Avatar',
  component: Avatar,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    shape: { control: 'inline-radio', options: ['circle', 'rounded'] },
    color: { control: 'select', options: colors },
    status: { control: 'inline-radio', options: [undefined, 'online', 'offline', 'busy', 'away'] },
    fallback: { control: false },
  },
  args: { name: 'Ada Lovelace' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--axon-space-3)',
  flexWrap: 'wrap',
} as const;

export const Playground: Story = {};

export const WithImage: Story = { args: { src: PORTRAIT } };

export const BrokenImageFallsBack: Story = {
  args: { src: '/this-image-does-not-exist.png', name: 'Grace Hopper' },
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Avatar key={size} name="Ada Lovelace" size={size} />
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={row}>
      {colors.map((color) => (
        <Avatar key={color} name={color} color={color} />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Ada Lovelace" shape="circle" />
      <Avatar name="Ada Lovelace" shape="rounded" />
      <Avatar src={PORTRAIT} name="Ada Lovelace" shape="rounded" />
    </div>
  ),
};

export const Status: Story = {
  render: () => (
    <div style={row}>
      {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
        <Avatar key={status} name="Ada Lovelace" status={status} />
      ))}
    </div>
  ),
};

export const IconFallback: Story = { args: { name: undefined, alt: 'Guest user' } };
