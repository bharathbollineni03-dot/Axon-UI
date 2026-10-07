import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Link } from '../Link';
import { AppBar } from './AppBar';

const MenuGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="1.25em"
    height="1.25em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const meta = {
  title: 'Navigation/AppBar',
  component: AppBar,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    position: { control: 'inline-radio', options: ['static', 'sticky', 'fixed'] },
    color: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    bordered: { control: 'boolean' },
    elevated: { control: 'boolean' },
  },
  args: { position: 'static', color: 'default', elevated: false },
} satisfies Meta<typeof AppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <AppBar
      {...args}
      leading={
        <IconButton aria-label="Open navigation">
          <MenuGlyph />
        </IconButton>
      }
      trailing={
        <>
          <Button variant="ghost" size="sm">
            Docs
          </Button>
          <Avatar name="Ada Lovelace" size="sm" />
        </>
      }
    >
      Axon
    </AppBar>
  ),
};

export const Colored: Story = {
  render: () => (
    <AppBar
      color="primary"
      trailing={
        <Link href="#" underline="always" style={{ color: 'inherit' }}>
          Sign out
        </Link>
      }
    >
      Axon
    </AppBar>
  ),
};

export const Elevated: Story = {
  render: () => (
    <AppBar elevated bordered={false}>
      Elevated, no border
    </AppBar>
  ),
};

export const Sticky: Story = {
  render: () => (
    <div
      // A scrollable area has to be reachable by keyboard so its content can be scrolled.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      style={{ height: '16rem', overflow: 'auto', fontFamily: 'var(--axon-font-sans)' }}
    >
      <AppBar position="sticky" elevated>
        Stays at the top while the content scrolls
      </AppBar>
      <div style={{ padding: 'var(--axon-space-4)' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>Scrolling content, paragraph {i + 1}.</p>
        ))}
      </div>
    </div>
  ),
};
