import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Rating, type RatingProps } from './Rating';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Core/Rating',
  component: Rating,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    precision: { control: 'inline-radio', options: [0.5, 1] },
    max: { control: 'number' },
    readOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    allowClear: { control: 'boolean' },
    icon: { control: false },
    emptyIcon: { control: false },
    onChange: { action: 'changed' },
  },
  args: { 'aria-label': 'Product rating', defaultValue: 3 },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

const stack = { display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' } as const;

export const Playground: Story = {};

export const HalfStars: Story = { args: { precision: 0.5, defaultValue: 3.5 } };

export const ReadOnly: Story = {
  render: () => (
    <div style={stack}>
      <Rating readOnly value={4} aria-label="Average rating" />
      <Rating readOnly value={3.5} precision={0.5} aria-label="Average rating" />
      <Rating readOnly value={0} aria-label="Average rating" />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: () => (
    <div style={stack}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Rating key={size} size={size} defaultValue={4} aria-label={`Rating ${size}`} />
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={stack}>
      {colors.map((color) => (
        <Rating key={color} color={color} defaultValue={4} aria-label={color} />
      ))}
    </div>
  ),
};

const Heart = () => (
  <svg viewBox="0 0 24 24" width="1.5rem" height="1.5rem" aria-hidden="true">
    <path
      d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ fill: 'inherit' }}
    />
  </svg>
);

export const CustomIcons: Story = {
  args: { icon: <Heart />, emptyIcon: <Heart />, color: 'danger', max: 5, defaultValue: 3 },
};

function ControlledDemo(args: RatingProps) {
  const [value, setValue] = useState(2);
  return (
    <div style={stack}>
      <Rating {...args} value={value} onChange={setValue} />
      <span>
        {value} / {args.max ?? 5}
      </span>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
