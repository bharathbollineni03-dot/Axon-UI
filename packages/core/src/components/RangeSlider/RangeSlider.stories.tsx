import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RangeSlider, type RangeSliderProps } from './RangeSlider';

const meta = {
  title: 'Core/RangeSlider',
  component: RangeSlider,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
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
  args: { label: 'Price range', defaultValue: [20, 70], showValue: true },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 28rem)', paddingTop: 'var(--axon-space-8)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithFormattedValues: Story = {
  args: {
    min: 0,
    max: 1000,
    step: 50,
    defaultValue: [200, 650],
    tooltip: 'always',
    formatValue: (v) => `$${v}`,
    marks: [
      { value: 0, label: '$0' },
      { value: 500, label: '$500' },
      { value: 1000, label: '$1000' },
    ],
  },
};

export const CustomThumbLabels: Story = {
  args: {
    label: undefined,
    'aria-label': 'Working hours',
    thumbLabels: ['Start', 'End'],
    min: 0,
    max: 24,
    defaultValue: [9, 17],
    formatValue: (v) => `${v}:00`,
    tooltip: 'always',
  },
};

export const Disabled: Story = { args: { disabled: true } };

function ControlledDemo(args: RangeSliderProps) {
  const [value, setValue] = useState<[number, number]>([30, 60]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <RangeSlider {...args} value={value} onChange={setValue} />
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
