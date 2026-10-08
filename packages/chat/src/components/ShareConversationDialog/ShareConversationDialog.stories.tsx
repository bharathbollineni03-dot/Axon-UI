import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axonui/core';
import {
  ShareConversationDialog,
  type ShareConversationDialogProps,
} from './ShareConversationDialog';

const meta: Meta<ShareConversationDialogProps> = {
  title: 'Chat/ShareConversationDialog',
  component: ShareConversationDialog,
  parameters: { layout: 'padded' },
  argTypes: {
    open: { control: false },
    onClose: { control: false },
    onCreateLink: { control: false },
    onStopSharing: { control: false },
  },
};
export default meta;
type Story = StoryObj<ShareConversationDialogProps>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Demo(props: Partial<ShareConversationDialogProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Share</Button>
      <ShareConversationDialog {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export const Playground: Story = {
  name: 'Create a link, then stop sharing',
  render: () => (
    <Demo
      onCreateLink={async () => {
        await wait(700);
        return 'https://chat.example.com/s/k3j9x2m1';
      }}
      onStopSharing={() => wait(500)}
    />
  ),
};

export const AlreadyShared: Story = {
  render: () => <Demo url="https://chat.example.com/s/k3j9x2m1" onStopSharing={() => wait(500)} />,
};

export const CreatingFails: Story = {
  name: 'Creating the link fails',
  render: () => (
    <Demo
      onCreateLink={async () => {
        await wait(500);
        throw new Error('offline');
      }}
    />
  ),
};

export const LinkOnly: Story = {
  name: 'Link only (no stop button)',
  render: () => <Demo url="https://chat.example.com/s/k3j9x2m1" />,
};
