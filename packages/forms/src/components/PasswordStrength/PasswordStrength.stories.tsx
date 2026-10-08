import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TextField } from '@axon/core';
import { PasswordStrengthMeter } from './PasswordStrength';

const meta = {
  title: 'Prebuilt forms/PasswordStrengthMeter',
  component: PasswordStrengthMeter,
  parameters: { layout: 'padded' },
  args: { value: 'abcdefgH1' },
  argTypes: { labels: { control: false } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordStrengthMeter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllScores: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      {['', 'short', 'abcdefgH1', 'abcdefgH1!', 'abcdefghijkL1!'].map((value) => (
        <PasswordStrengthMeter key={value} value={value} />
      ))}
    </div>
  ),
};

function Typing() {
  const [value, setValue] = useState('');
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-2)' }}>
      <TextField
        label="Password"
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        fullWidth
      />
      <PasswordStrengthMeter value={value} />
    </div>
  );
}

export const WhileTyping: Story = { render: () => <Typing /> };

export const Translated: Story = {
  args: {
    value: 'abcdefgH1!',
    labels: { meter: 'Seguridad', scores: ['', 'Débil', 'Regular', 'Buena', 'Fuerte'] },
  },
};
