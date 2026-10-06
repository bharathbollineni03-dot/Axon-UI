import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Slider, type SliderProps } from './Slider';

const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'] as const;

const meta = {
  title: 'Core/Slider',
  component: Slider,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: colors },
    tooltip: { control: 'inline-radio', options: ['auto', 'always', 'never'] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    marks: { control: 'boolean' },
    showValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onChange: { action: 'changed' },
    onChangeEnd: { action: 'changeEnd' },
  },
  args: { label: 'Volume', defaultValue: 40, showValue: true },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 28rem)', paddingTop: 'var(--axon-space-8)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Steps: Story = {
  args: {
    label: 'Rating',
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 5,
    marks: true,
    tooltip: 'always',
  },
};

export const LabelledMarks: Story = {
  args: {
    label: 'Temperature',
    min: 0,
    max: 100,
    step: 10,
    defaultValue: 30,
    marks: [
      { value: 0, label: '0°C' },
      { value: 25, label: '25°C' },
      { value: 50, label: '50°C' },
      { value: 100, label: '100°C' },
    ],
    formatValue: (v) => `${v}°C`,
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-6)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Slider key={size} {...args} size={size} label={`Size ${size}`} />
      ))}
    </div>
  ),
};

export const Colors: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-6)' }}>
      {colors.map((color) => (
        <Slider key={color} {...args} color={color} label={color} />
      ))}
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

function ControlledDemo(args: SliderProps) {
  const [value, setValue] = useState(25);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <Slider {...args} value={value} onChange={setValue} />
      <button type="button" onClick={() => setValue(75)}>
        Set to 75
      </button>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
