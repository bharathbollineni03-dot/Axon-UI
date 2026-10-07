import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../Badge';
import { IconButton } from '../IconButton';
import { Switch } from '../Switch';
import { List, ListItem } from './List';

const InboxIcon = () => (
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
    <path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
  </svg>
);

const TrashIcon = () => (
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
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

const meta = {
  title: 'Layout/List',
  component: List,
  parameters: { layout: 'padded' },
  argTypes: {
    ordered: { control: 'boolean' },
    dense: { control: 'boolean' },
    divided: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: { bordered: true, divided: true, 'aria-label': 'Mailboxes' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 24rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem
        icon={<InboxIcon />}
        primary="Inbox"
        secondary="12 unread"
        action={<Badge content={12} />}
      />
      <ListItem icon={<InboxIcon />} primary="Drafts" secondary="2 saved" />
      <ListItem icon={<InboxIcon />} primary="Archive" />
    </List>
  ),
};

function SelectableDemo(args: React.ComponentProps<typeof List>) {
  const [selected, setSelected] = useState('Inbox');
  return (
    <List {...args}>
      {['Inbox', 'Drafts', 'Sent', 'Trash'].map((name) => (
        <ListItem
          key={name}
          icon={<InboxIcon />}
          primary={name}
          selected={selected === name}
          onClick={() => setSelected(name)}
        />
      ))}
    </List>
  );
}

export const SelectableRows: Story = {
  render: (args) => <SelectableDemo {...args} />,
};

export const WithActions: Story = {
  render: (args) => (
    <List {...args}>
      <ListItem
        primary="Project plan.pdf"
        secondary="2.4 MB"
        action={
          <IconButton aria-label="Delete Project plan.pdf" size="sm" color="danger">
            <TrashIcon />
          </IconButton>
        }
      />
      <ListItem
        primary="Notifications"
        secondary="Email me about activity"
        action={<Switch aria-label="Notifications" />}
      />
    </List>
  ),
};

export const Links: Story = {
  render: (args) => (
    <List {...args} aria-label="Resources">
      <ListItem primary="Documentation" href="https://example.com/docs" />
      <ListItem primary="Changelog" href="https://example.com/changelog" />
      <ListItem primary="Unavailable" href="https://example.com" disabled />
    </List>
  ),
};

export const Ordered: Story = {
  args: { ordered: true, bordered: false, divided: false },
  render: (args) => (
    <List {...args} aria-label="Steps">
      <ListItem primary="Install the packages" />
      <ListItem primary="Import the styles" />
      <ListItem primary="Wrap your app in ThemeProvider" />
    </List>
  ),
};

export const Dense: Story = {
  args: { dense: true },
  render: Playground.render,
};
