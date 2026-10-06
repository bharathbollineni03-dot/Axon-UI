import type { Meta, StoryObj } from '@storybook/react';
import { Link } from './Link';

const meta = {
  title: 'Navigation/Link',
  component: Link,
  parameters: { layout: 'padded' },
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    underline: { control: 'inline-radio', options: ['always', 'hover', 'none'] },
    external: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  args: { href: '#', children: 'Read the docs', color: 'primary', underline: 'hover' },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-4)', flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const).map(
        (color) => (
          <Link key={color} href="#" color={color} underline="always">
            {color}
          </Link>
        ),
      )}
    </div>
  ),
};

export const Underline: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-4)' }}>
      <Link href="#" underline="always">
        Always
      </Link>
      <Link href="#" underline="hover">
        On hover
      </Link>
      <Link href="#" underline="none">
        None
      </Link>
    </div>
  ),
};

export const InRunningText: Story = {
  render: () => (
    <p style={{ maxWidth: '32rem', fontFamily: 'var(--axon-font-sans)' }}>
      Links inside a paragraph should keep their underline so they do not rely on color alone. See
      the{' '}
      <Link href="#" underline="always">
        accessibility guide
      </Link>{' '}
      and the{' '}
      <Link href="#" underline="always">
        changelog
      </Link>
      .
    </p>
  ),
};

export const External: Story = {
  render: () => (
    <Link href="https://example.com" external>
      Example site
    </Link>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Link href="#" disabled>
      Not available
    </Link>
  ),
};
