import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Overlays/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'padded' },
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    initialFocus: { control: 'inline-radio', options: ['confirm', 'cancel'] },
    closeOnBackdrop: { control: 'boolean' },
  },
  args: {
    open: false,
    title: 'Discard changes?',
    description: 'You have unsaved changes that will be lost.',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example({
  trigger,
  ...props
}: Partial<React.ComponentProps<typeof ConfirmDialog>> & { trigger: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('No answer yet.');
  return (
    <div style={{ fontFamily: 'var(--axon-font-sans)' }}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <ConfirmDialog
        title="Discard changes?"
        description="You have unsaved changes that will be lost."
        {...props}
        open={open}
        onCancel={() => {
          setOpen(false);
          setResult('Cancelled.');
        }}
        onConfirm={async () => {
          await props.onConfirm?.();
          setOpen(false);
          setResult('Confirmed.');
        }}
      />
      <p>{result}</p>
    </div>
  );
}

export const Playground: Story = {
  render: (args) => <Example {...args} trigger="Discard…" confirmLabel="Discard" />,
};

export const Destructive: Story = {
  name: 'Destructive (focus starts on Cancel)',
  render: () => (
    <Example
      trigger="Delete project…"
      color="danger"
      title="Delete Apollo?"
      description="This permanently deletes the project and its 48 files. This cannot be undone."
      confirmLabel="Delete project"
    >
      <strong>Apollo</strong>
    </Example>
  ),
};

export const AsyncConfirmation: Story = {
  name: 'Async (busy until the promise settles)',
  render: () => (
    <Example
      trigger="Publish…"
      title="Publish now?"
      description="Subscribers will be emailed right away."
      confirmLabel="Publish"
      onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1500))}
    />
  ),
};
