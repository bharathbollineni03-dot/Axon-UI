import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../Avatar';
import { IconButton } from '../IconButton';
import { Badge } from './Badge';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9ZM10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

const meta = {
  title: 'Layout/Badge',
  component: Badge,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['solid', 'subtle', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    color: { control: 'select', options: colors },
    placement: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    dot: { control: 'boolean' },
    showZero: { control: 'boolean' },
    max: { control: 'number' },
    content: { control: 'text' },
  },
  args: { content: 12 },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--axon-space-4)',
  flexWrap: 'wrap',
} as const;

export const Playground: Story = {};

export const Standalone: Story = {
  render: () => (
    <div style={row}>
      {(['solid', 'subtle', 'outline'] as const).map((variant) =>
        colors.map((color) => (
          <Badge key={`${variant}-${color}`} content={color} variant={variant} color={color} />
        )),
      )}
    </div>
  ),
};

export const OnAnIconButton: Story = {
  render: () => (
    <div style={row}>
      <Badge content={4} label="4 unread notifications">
        <IconButton aria-label="Notifications, 4 unread" variant="outline">
          <BellIcon />
        </IconButton>
      </Badge>
      <Badge content={120}>
        <IconButton aria-label="Notifications, more than 99 unread" variant="outline">
          <BellIcon />
        </IconButton>
      </Badge>
      <Badge dot>
        <IconButton aria-label="Notifications, new activity" variant="outline">
          <BellIcon />
        </IconButton>
      </Badge>
    </div>
  ),
};

export const OnAnAvatar: Story = {
  render: () => (
    <div style={row}>
      {(['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const).map((placement) => (
        <Badge key={placement} dot color="success" placement={placement}>
          <Avatar name="Ada Lovelace" />
        </Badge>
      ))}
    </div>
  ),
};

export const ZeroAndOverflow: Story = {
  render: () => (
    <div style={row}>
      <Badge content={0} showZero />
      <Badge content={0} />
      <Badge content={100} />
      <Badge content={1000} max={999} />
    </div>
  ),
};
