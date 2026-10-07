import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Progress, type ProgressProps } from './Progress';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Feedback/Progress',
  component: Progress,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['linear', 'circular'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    max: { control: 'number' },
    showValue: { control: 'boolean' },
  },
  args: { label: 'Uploading report.pdf', value: 60, showValue: true },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<ProgressProps>;

const column = { display: 'grid', gap: 'var(--axon-space-4)' } as const;
const row = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--axon-space-6)',
  flexWrap: 'wrap',
} as const;

export const Playground: Story = {};

export const Indeterminate: Story = { args: { value: undefined, label: 'Loading the dashboard' } };

export const Sizes: Story = {
  render: () => (
    <div style={column}>
      <Progress label="Small" value={40} size="sm" />
      <Progress label="Medium" value={40} size="md" />
      <Progress label="Large" value={40} size="lg" />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={column}>
      {colors.map((color) => (
        <Progress key={color} aria-label={color} value={65} color={color} />
      ))}
    </div>
  ),
};

export const CustomValueText: Story = {
  render: () => (
    <Progress
      label="Files"
      value={7}
      max={12}
      showValue
      formatValue={(value, max) => `${value} of ${max}`}
    />
  ),
};

export const Circular: Story = {
  render: () => (
    <div style={row}>
      <Progress variant="circular" label="Small" value={30} size="sm" />
      <Progress variant="circular" label="Medium" value={60} showValue />
      <Progress variant="circular" label="Large" value={90} size="lg" showValue color="success" />
      <Progress variant="circular" aria-label="Working" />
    </div>
  ),
};

function SimulatedUpload() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 5)), 400);
    return () => clearInterval(timer);
  }, []);
  return (
    <div style={column}>
      <Progress
        label="Uploading"
        value={value}
        showValue
        color={value >= 100 ? 'success' : 'primary'}
      />
      <Progress variant="circular" label="Syncing" value={value} showValue size="lg" />
    </div>
  );
}

export const Animated: Story = { render: () => <SimulatedUpload /> };
