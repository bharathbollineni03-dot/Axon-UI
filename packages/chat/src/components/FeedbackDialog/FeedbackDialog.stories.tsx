import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@axonui/core';
import { FeedbackDialog, type FeedbackDialogProps, type FeedbackValue } from './FeedbackDialog';

const meta: Meta<FeedbackDialogProps> = {
  title: 'Chat/FeedbackDialog',
  component: FeedbackDialog,
  parameters: { layout: 'padded' },
  argTypes: {
    open: { control: false },
    onClose: { control: false },
    onSubmit: { control: false },
    reasons: { control: false },
    defaultRating: { control: 'inline-radio', options: [null, 'up', 'down'] },
    requireCommentOnDown: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<FeedbackDialogProps>;

/** Opens the dialog from a button and shows what was sent. */
function Demo({ fail = false, ...props }: Partial<FeedbackDialogProps> & { fail?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<FeedbackValue | null>(null);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', justifyItems: 'start' }}>
      <Button onClick={() => setOpen(true)}>Rate this response</Button>
      {sent ? (
        <pre style={{ margin: 0, fontSize: 'var(--axon-font-size-sm)' }}>
          {JSON.stringify(sent, null, 2)}
        </pre>
      ) : null}
      <FeedbackDialog
        {...props}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (fail) throw new Error('offline');
          setSent(value);
          setOpen(false);
        }}
      />
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const FromThumbsDown: Story = {
  name: 'Opened from a thumbs down',
  render: () => <Demo defaultRating="down" />,
};

export const RequiresAComment: Story = {
  render: () => <Demo defaultRating="down" requireCommentOnDown />,
};

export const WithCustomReasons: Story = {
  render: () => (
    <Demo
      defaultRating="down"
      reasons={{
        down: [
          { id: 'slow', label: 'Too slow' },
          { id: 'format', label: 'Wrong format' },
          { id: 'tone', label: 'Wrong tone' },
        ],
      }}
    />
  ),
};

export const WithQuotedResponse: Story = {
  render: () => (
    <Demo defaultRating="up">
      <blockquote
        style={{
          margin: 0,
          padding: 'var(--axon-space-2) var(--axon-space-3)',
          borderInlineStart: '3px solid var(--axon-color-border-strong)',
          color: 'var(--axon-color-text-secondary)',
        }}
      >
        Here is a small TypeScript helper that delays a call…
      </blockquote>
    </Demo>
  ),
};

export const SendingFails: Story = {
  name: 'Sending fails (try again)',
  render: () => <Demo defaultRating="up" fail />,
};
