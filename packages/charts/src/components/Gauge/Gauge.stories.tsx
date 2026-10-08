import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Gauge, type GaugeProps } from './Gauge';

const traffic = [
  { to: 60, color: 'var(--axon-color-success-solid)', label: 'Healthy' },
  { to: 85, color: 'var(--axon-color-warning-solid)', label: 'Busy' },
  { to: 100, color: 'var(--axon-color-danger-solid)', label: 'Overloaded' },
];

const meta: Meta<GaugeProps> = {
  title: 'Charts/Gauge',
  component: Gauge,
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: { type: 'range', min: -10, max: 110, step: 1 } },
    angle: { control: { type: 'range', min: 90, max: 300, step: 15 } },
    thickness: { control: { type: 'range', min: 0.05, max: 0.6, step: 0.01 } },
    width: { control: { type: 'number', min: 120, max: 480, step: 20 } },
    showLimits: { control: 'boolean' },
    loading: { control: 'boolean' },
    thresholds: { control: false },
  },
  args: { value: 72, label: 'CPU load', title: 'Server', valueFormat: '.0f' },
};
export default meta;
type Story = StoryObj<GaugeProps>;

export const Playground: Story = {};

export const WithThresholds: Story = {
  args: { thresholds: traffic, valueFormat: '.0f' },
};

export const Percent: Story = {
  args: {
    value: 0.64,
    min: 0,
    max: 1,
    valueFormat: '.0%',
    label: 'Goal reached',
    title: 'Quarterly target',
  },
};

export const ThreeQuarterDial: Story = {
  args: { angle: 270, thresholds: traffic, width: 240 },
};

export const Thin: Story = { args: { thickness: 0.08, width: 260 } };

export const CustomRange: Story = {
  args: {
    value: 21.5,
    min: -20,
    max: 50,
    valueFormat: '.1f',
    label: 'Temperature (°C)',
    title: 'Outside',
  },
};

export const NoReading: Story = { args: { value: null } };

export const Loading: Story = { args: { loading: true } };

function Live() {
  const [value, setValue] = useState(35);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)', justifyItems: 'start' }}>
      <Gauge
        value={value}
        thresholds={traffic}
        label="Load"
        title="Try the slider"
        valueFormat=".0f"
      />
      <label style={{ display: 'grid', gap: 'var(--axon-space-1)' }}>
        Value
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

export const Interactive: Story = { render: () => <Live /> };
