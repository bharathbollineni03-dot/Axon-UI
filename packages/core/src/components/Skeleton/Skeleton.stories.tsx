import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Card, CardContent } from '../Card';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['text', 'circle', 'rect'] },
    animation: { control: 'inline-radio', options: ['pulse', 'wave', false] },
    lines: { control: { type: 'number', min: 1, max: 10 } },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: { variant: 'text', animation: 'pulse' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '24rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)' }}>
      <Skeleton variant="text" />
      <Skeleton variant="circle" width={56} />
      <Skeleton variant="rect" height={96} />
    </div>
  ),
};

export const Paragraph: Story = { args: { lines: 4 } };

export const Wave: Story = { args: { variant: 'rect', height: 96, animation: 'wave' } };

export const Still: Story = { args: { variant: 'rect', height: 96, animation: false } };

function ProfileCard({ loading }: { loading: boolean }) {
  return (
    <Card aria-busy={loading}>
      <CardContent>
        <div style={{ display: 'flex', gap: 'var(--axon-space-3)', alignItems: 'center' }}>
          {loading ? (
            <Skeleton variant="circle" width={48} />
          ) : (
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--axon-color-primary-subtle)',
                color: 'var(--axon-color-primary-text)',
                fontWeight: 600,
              }}
            >
              AL
            </span>
          )}
          <div style={{ flex: 1 }}>
            {loading ? (
              <>
                <Skeleton width="50%" />
                <Skeleton width="30%" />
              </>
            ) : (
              <>
                <strong>Ada Lovelace</strong>
                <div style={{ color: 'var(--axon-color-text-secondary)' }}>Mathematician</div>
              </>
            )}
          </div>
        </div>
        <div style={{ marginTop: 'var(--axon-space-4)' }}>
          {loading ? (
            <Skeleton lines={3} />
          ) : (
            <p style={{ margin: 0 }}>
              Wrote the first published algorithm intended for a machine, in notes on the Analytical
              Engine.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <ProfileCard loading={loading} />
      <div>
        <Button size="sm" variant="outline" onClick={() => setLoading(true)} disabled={loading}>
          Reload
        </Button>
      </div>
    </div>
  );
}

export const CardPlaceholder: Story = {
  name: 'Placeholder for a card',
  render: () => <LoadingDemo />,
};
