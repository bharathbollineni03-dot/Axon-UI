import type { Meta, StoryObj } from '@storybook/react';
import { Image } from './Image';

const SCENE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='640' height='360' fill='%2393c5fd'/><circle cx='160' cy='120' r='50' fill='%23fde68a'/><path d='M0 360 L220 170 L380 290 L500 190 L640 320 V360Z' fill='%231d4ed8'/></svg>";

const meta = {
  title: 'Layout/Image',
  component: Image,
  parameters: { layout: 'padded' },
  argTypes: {
    fit: { control: 'inline-radio', options: ['cover', 'contain', 'fill', 'none', 'scale-down'] },
    radius: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl', 'full'] },
    aspectRatio: { control: 'text' },
    fallback: { control: false },
  },
  args: { src: SCENE, alt: 'A mountain landscape', radius: 'md' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 24rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Image>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AspectRatios: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      {['16 / 9', '4 / 3', '1 / 1'].map((ratio) => (
        <Image key={ratio} {...args} aspectRatio={ratio} />
      ))}
    </div>
  ),
};

export const BrokenWithPlaceholder: Story = {
  args: {
    src: '/this-image-does-not-exist.png',
    alt: 'Image that could not be loaded',
    aspectRatio: '16 / 9',
  },
};

export const BrokenWithFallbackImage: Story = {
  args: {
    src: '/this-image-does-not-exist.png',
    fallback: SCENE,
    alt: 'Falls back to another image',
  },
};

export const BrokenWithFallbackNode: Story = {
  args: {
    src: '/this-image-does-not-exist.png',
    alt: 'Company logo',
    aspectRatio: '3 / 1',
    fallback: <strong style={{ color: 'var(--axon-color-text-secondary)' }}>ACME Inc.</strong>,
  },
};
