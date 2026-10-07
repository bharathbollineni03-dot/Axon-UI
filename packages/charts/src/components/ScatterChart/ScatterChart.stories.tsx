import type { Meta, StoryObj } from '@storybook/react';
import { channels } from '../../stories/data';
import { ScatterChart, type ScatterChartProps } from './ScatterChart';

const meta: Meta<ScatterChartProps> = {
  title: 'Charts/ScatterChart',
  component: ScatterChart,
  parameters: { layout: 'padded' },
  argTypes: {
    opacity: { control: { type: 'range', min: 0.1, max: 1, step: 0.05 } },
    pointSize: { control: { type: 'number', min: 2, max: 16 } },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    height: { control: { type: 'number', min: 160, max: 700, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
  },
  args: {
    data: channels,
    xKey: 'spend',
    yKey: 'conversions',
    title: 'Marketing channels',
    description: 'Spend against conversions',
    height: 380,
    valueFormat: ',.0f',
    xAxis: { label: 'Spend ($)', tickFormat: '$,.0f' },
    yAxis: { label: 'Conversions' },
  },
};
export default meta;
type Story = StoryObj<ScatterChartProps>;

export const Plain: Story = {};

export const ColouredByGroup: Story = {
  args: { colorKey: 'group', labelKey: 'name' },
};

export const SizedByRevenue: Story = {
  name: 'Coloured by group, sized by revenue',
  args: {
    colorKey: 'group',
    labelKey: 'name',
    sizeKey: 'revenue',
    sizeRange: [4, 22],
    opacity: 0.6,
  },
};

export const OwnColours: Story = {
  args: {
    colorKey: 'group',
    colors: { Search: '#0ea5e9', Social: '#f59e0b', Email: '#22c55e', Partners: '#8b5cf6' },
  },
};

export const FixedAxes: Story = {
  args: { xDomain: [0, 12000], yDomain: [0, 400], colorKey: 'group' },
};

export const ManyPoints: Story = {
  name: '2,000 points',
  args: {
    data: Array.from({ length: 2000 }, (_, i) => {
      const t = (i * 9301 + 49297) % 233280;
      const x = (t / 233280) * 100;
      const y = x * 0.8 + (((i * 7919) % 1000) / 1000 - 0.5) * 40;
      return { x, y };
    }),
    xKey: 'x',
    yKey: 'y',
    pointSize: 2.5,
    opacity: 0.4,
    animate: false,
    title: 'Two thousand points',
    description: undefined,
    xAxis: { label: 'x' },
    yAxis: { label: 'y' },
  },
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
