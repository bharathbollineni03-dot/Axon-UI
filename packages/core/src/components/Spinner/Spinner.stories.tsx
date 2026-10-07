import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { Spinner } from './Spinner';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Feedback/Spinner',
  component: Spinner,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: [...colors, 'inherit'] },
    decorative: { control: 'boolean' },
  },
  args: { size: 'md', color: 'primary', label: 'Loading' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--axon-space-4)',
  flexWrap: 'wrap',
} as const;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={row}>
      {colors.map((color) => (
        <Spinner key={color} color={color} label={`Loading ${color}`} />
      ))}
    </div>
  ),
};

export const InheritsTextColor: Story = {
  render: () => (
    <div style={{ ...row, color: 'var(--axon-color-danger-text)' }}>
      <Spinner color="inherit" />
      <span>Retrying the connection…</span>
    </div>
  ),
};

export const InsideAButton: Story = {
  name: 'Decorative, inside a busy button',
  render: () => (
    <Button aria-busy="true" startIcon={<Spinner size="sm" color="inherit" decorative />}>
      Saving
    </Button>
  ),
};

export const LoadingRegion: Story = {
  name: 'Centered in a loading region',
  render: () => (
    <div
      aria-busy="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        gap: 'var(--axon-space-2)',
        height: '10rem',
        border: '1px dashed var(--axon-color-border-strong)',
        borderRadius: 'var(--axon-radius-lg)',
      }}
    >
      <Spinner size="lg" label="Loading the report" />
    </div>
  ),
};
