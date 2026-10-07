import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Spinner } from '../Spinner';
import { ToastProvider, useToast, type ToastPlacement } from './Toast';

const placements: ToastPlacement[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const meta = {
  title: 'Feedback/Toast',
  component: ToastProvider,
  parameters: { layout: 'padded' },
  argTypes: {
    placement: { control: 'select', options: placements },
    duration: { control: 'number' },
    limit: { control: { type: 'number', min: 1, max: 10 } },
  },
  args: { placement: 'bottom-right', duration: 5000, limit: 3 },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--axon-space-2)',
  flexWrap: 'wrap',
} as const;

function StatusButtons() {
  const toast = useToast();
  return (
    <div style={row}>
      <Button variant="outline" onClick={() => toast.info('New version available')}>
        Info
      </Button>
      <Button
        variant="outline"
        color="success"
        onClick={() =>
          toast.success('Changes saved', { description: 'Your profile is up to date.' })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        color="warning"
        onClick={() => toast.warning('Storage almost full', { description: '92% of 5 GB used.' })}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        color="danger"
        onClick={() =>
          toast.danger('Payment failed', { description: 'Your card was declined. Try another.' })
        }
      >
        Danger
      </Button>
    </div>
  );
}

export const Playground: Story = {
  render: (args) => (
    <ToastProvider {...args}>
      <StatusButtons />
    </ToastProvider>
  ),
};

function WithActionDemo() {
  const toast = useToast();
  const [archived, setArchived] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', justifyItems: 'start' }}>
      <Button
        onClick={() => {
          setArchived(true);
          toast.show({
            title: 'Conversation archived',
            duration: 8000,
            action: { label: 'Undo', onClick: () => setArchived(false) },
          });
        }}
      >
        Archive conversation
      </Button>
      <span aria-live="polite">Status: {archived ? 'archived' : 'in your inbox'}</span>
    </div>
  );
}

export const WithAction: Story = {
  render: (args) => (
    <ToastProvider {...args}>
      <WithActionDemo />
    </ToastProvider>
  ),
};

function PersistentDemo() {
  const toast = useToast();
  return (
    <div style={row}>
      <Button
        onClick={() =>
          toast.show({
            title: 'You are offline',
            description: 'Changes will sync when you reconnect.',
            status: 'warning',
            duration: 0,
          })
        }
      >
        Show a toast that stays
      </Button>
      <Button variant="ghost" onClick={() => toast.dismissAll()}>
        Dismiss all
      </Button>
    </div>
  );
}

export const StaysUntilDismissed: Story = {
  render: (args) => (
    <ToastProvider {...args}>
      <PersistentDemo />
    </ToastProvider>
  ),
};

function LoadingDemo() {
  const toast = useToast();
  const run = () => {
    const id = toast.show({
      id: 'export',
      title: 'Exporting report…',
      icon: <Spinner size="sm" decorative />,
      duration: 0,
      dismissible: false,
    });
    setTimeout(() => {
      // Same id: the toast changes in place, and gets the default duration again.
      toast.show({
        id,
        status: 'success',
        title: 'Report exported',
        description: 'report-2026.csv is ready.',
      });
    }, 2500);
  };
  return <Button onClick={run}>Export report</Button>;
}

export const LoadingThenSuccess: Story = {
  name: 'Loading, then success (same id)',
  render: (args) => (
    <ToastProvider {...args}>
      <LoadingDemo />
    </ToastProvider>
  ),
};

function QueueDemo() {
  const toast = useToast();
  const [count, setCount] = useState(0);
  return (
    <div style={row}>
      <Button
        onClick={() => {
          const next = count + 1;
          setCount(next);
          toast.show({ title: `Notification ${next}`, duration: 3000 });
        }}
      >
        Add a notification
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          for (let i = 0; i < 6; i++) {
            toast.show({ title: `Batch notification ${i + 1}`, duration: 3000 });
          }
        }}
      >
        Add six at once
      </Button>
      <span style={{ color: 'var(--axon-color-text-secondary)' }}>
        Only `limit` are visible; the rest wait their turn.
      </span>
    </div>
  );
}

export const Queue: Story = {
  render: (args) => (
    <ToastProvider {...args} limit={2}>
      <QueueDemo />
    </ToastProvider>
  ),
};

function PlacementDemo({ placement }: { placement: ToastPlacement }) {
  const toast = useToast();
  return (
    <Button onClick={() => toast.info(`Placed at ${placement}`, { duration: 2500 })}>
      Show at {placement}
    </Button>
  );
}

export const Placements: Story = {
  render: (args) => (
    <div style={row}>
      {placements.map((placement) => (
        <ToastProvider key={placement} {...args} placement={placement}>
          <PlacementDemo placement={placement} />
        </ToastProvider>
      ))}
    </div>
  ),
};

function PauseDemo() {
  const toast = useToast();
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-2)', justifyItems: 'start' }}>
      <Button onClick={() => toast.info('Hover or focus me', { duration: 4000 })}>
        Show a 4 second toast
      </Button>
      <span style={{ color: 'var(--axon-color-text-secondary)' }}>
        The timer stops while the pointer is over the toast or keyboard focus is inside it, and
        picks up where it left off. Esc closes the toast you are focused on.
      </span>
    </div>
  );
}

export const PausesOnHoverAndFocus: Story = {
  render: (args) => (
    <ToastProvider {...args}>
      <PauseDemo />
    </ToastProvider>
  ),
};
