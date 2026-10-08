import type { Meta, StoryObj } from '@storybook/react';
import { browserShare } from '../../stories/data';
import { DonutChart, PieChart, type PieChartProps } from './PieChart';

const meta: Meta<PieChartProps> = {
  title: 'Charts/PieChart and DonutChart',
  component: PieChart,
  parameters: { layout: 'padded' },
  argTypes: {
    innerRadius: { control: { type: 'range', min: 0, max: 0.9, step: 0.05 } },
    padAngle: { control: { type: 'range', min: 0, max: 8, step: 0.5 } },
    cornerRadius: { control: { type: 'number', min: 0, max: 12 } },
    startAngle: { control: { type: 'range', min: -180, max: 180, step: 15 } },
    sliceLabels: { control: 'inline-radio', options: ['outside', 'inside', 'none'] },
    sliceLabelContent: {
      control: 'inline-radio',
      options: ['name', 'percent', 'name-percent', 'value'],
    },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    height: { control: { type: 'number', min: 160, max: 600, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
  },
  args: {
    data: browserShare,
    title: 'Visits by browser',
    description: 'Last 30 days',
    height: 340,
    valueFormat: ',.0f',
  },
};
export default meta;
type Story = StoryObj<PieChartProps>;

export const Pie: Story = {};

export const Donut: Story = {
  render: (args) => <DonutChart {...args} />,
};

export const DonutWithCustomMiddle: Story = {
  render: (args) => <DonutChart {...args} centerLabel="Visits" centerValue="10.5k" />,
};

export const LabelsInside: Story = {
  args: { sliceLabels: 'inside', sliceLabelContent: 'percent' },
};

export const LabelsAreValues: Story = {
  args: { sliceLabelContent: 'value', valueFormat: '~s' },
};

export const NoLabels: Story = {
  args: { sliceLabels: 'none' },
};

export const OwnColours: Story = {
  args: {
    colors: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
  },
};

export const ManySmallSlices: Story = {
  name: 'Many slices (small ones stay unlabelled)',
  args: {
    data: [
      { name: 'Direct', value: 4200 },
      { name: 'Search', value: 3100 },
      { name: 'Social', value: 1800 },
      { name: 'Email', value: 900 },
      { name: 'Referral', value: 640 },
      { name: 'Ads', value: 420 },
      { name: 'Partners', value: 260 },
      { name: 'Press', value: 120 },
      { name: 'Events', value: 60 },
      { name: 'Other', value: 30 },
    ],
  },
  render: (args) => <DonutChart {...args} />,
};

export const HalfCircle: Story = {
  args: { startAngle: -90, padAngle: 2, cornerRadius: 4 },
  render: (args) => <DonutChart {...args} />,
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
