import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Alert } from './Alert';

const statuses = ['info', 'success', 'warning', 'danger'] as const;
const variants = ['subtle', 'solid', 'outline'] as const;

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  parameters: { layout: 'padded' },
  argTypes: {
    status: { control: 'inline-radio', options: statuses },
    variant: { control: 'inline-radio', options: variants },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    icon: { control: false },
    actions: { control: false },
    onClose: { action: 'closed' },
  },
  args: {
    status: 'info',
    title: 'A new version is available',
    children: 'Reload the page to get the latest features and fixes.',
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'grid', gap: 'var(--axon-space-3)', maxWidth: '40rem' } as const;

export const Playground: Story = {};

export const Statuses: Story = {
  render: () => (
    <div style={stack}>
      {statuses.map((status) => (
        <Alert key={status} status={status} title={`${status[0]!.toUpperCase()}${status.slice(1)}`}>
          This is a {status} message.
        </Alert>
      ))}
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-6)' }}>
      {variants.map((variant) => (
        <div key={variant} style={stack}>
          {statuses.map((status) => (
            <Alert key={status} status={status} variant={variant} title={variant}>
              A {status} alert.
            </Alert>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Small: Story = {
  args: { size: 'sm', title: undefined, children: 'Your changes were saved.', status: 'success' },
};

export const MessageOnly: Story = { args: { title: undefined } };

export const WithoutIcon: Story = { args: { icon: false } };

export const WithActions: Story = {
  args: {
    status: 'danger',
    title: 'Upload failed',
    children: 'We could not upload report.pdf. Check your connection and try again.',
    actions: (
      <>
        <Button size="sm" color="danger">
          Retry
        </Button>
        <Button size="sm" variant="ghost" color="danger">
          Cancel
        </Button>
      </>
    ),
  },
};

function DismissibleDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div style={stack}>
      {open ? (
        <Alert status="warning" title="Unsaved changes" onClose={() => setOpen(false)}>
          You have unsaved changes that will be lost if you leave this page.
        </Alert>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Show the alert again
        </Button>
      )}
    </div>
  );
}

export const Dismissible: Story = { render: () => <DismissibleDemo /> };

export const LongContent: Story = {
  args: {
    status: 'warning',
    onClose: () => {},
    children:
      'This message is long on purpose: it shows that the text wraps inside the alert, that the icon stays aligned with the first line and that the close button keeps its place in the corner even when the message takes several lines on a narrow screen.',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '24rem' }}>
        <Story />
      </div>
    ),
  ],
};
