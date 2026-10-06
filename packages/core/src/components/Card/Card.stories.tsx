import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Card, CardContent, CardFooter, CardHeader, CardMedia } from './Card';

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const meta = {
  title: 'Layout/Card',
  component: Card,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['outlined', 'elevated', 'filled'] },
    elevation: { control: 'inline-radio', options: [0, 1, 2, 3] },
    clickable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  args: { variant: 'outlined' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 22rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader
        avatar={<Avatar name="Ada Lovelace" />}
        title="Analytical Engine"
        titleAs="h3"
        subtitle="Updated 2 days ago"
        action={
          <IconButton aria-label="More options" size="sm">
            <MoreIcon />
          </IconButton>
        }
      />
      <CardMedia
        alt=""
        aspectRatio="16 / 9"
        src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='320' height='180' fill='%2393c5fd'/><circle cx='80' cy='70' r='28' fill='%23fde68a'/><path d='M0 180 L110 90 L190 150 L250 100 L320 160 V180Z' fill='%231d4ed8'/></svg>"
      />
      <CardContent>
        A short description of the project. Cards group related content and actions.
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm">
          Share
        </Button>
        <Button size="sm">Open</Button>
      </CardFooter>
    </Card>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Card variant="outlined">
        <CardContent>Outlined</CardContent>
      </Card>
      <Card variant="elevated" elevation={1}>
        <CardContent>Elevated 1</CardContent>
      </Card>
      <Card variant="elevated" elevation={3}>
        <CardContent>Elevated 3</CardContent>
      </Card>
      <Card variant="filled">
        <CardContent>Filled</CardContent>
      </Card>
    </div>
  ),
};

export const Clickable: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Card {...args} clickable onClick={args.onClick ?? (() => {})}>
        <CardContent>
          <strong>Clickable card.</strong> Focus it and press Enter or Space.
        </CardContent>
      </Card>
      <Card clickable href="https://example.com">
        <CardContent>
          <strong>Link card.</strong> Rendered as an anchor.
        </CardContent>
      </Card>
      <Card clickable disabled onClick={() => {}}>
        <CardContent>Disabled clickable card.</CardContent>
      </Card>
    </div>
  ),
};

export const FooterAlignment: Story = {
  render: () => (
    <Card>
      <CardContent>Footer actions can sit at the start, the end, or be spread out.</CardContent>
      <CardFooter align="between">
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
};
