import type { Meta, StoryObj } from '@storybook/react';
import { skills } from '../../stories/data';
import { RadarChart, type RadarChartProps } from './RadarChart';

const meta: Meta<RadarChartProps> = {
  title: 'Charts/RadarChart',
  component: RadarChart,
  parameters: { layout: 'padded' },
  argTypes: {
    levels: { control: { type: 'number', min: 1, max: 10 } },
    fillOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    dots: { control: 'boolean' },
    max: { control: { type: 'number', min: 10, max: 200 } },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    height: { control: { type: 'number', min: 200, max: 700, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
    series: { control: false },
  },
  args: {
    data: skills,
    axisKey: 'skill',
    series: [
      { key: 'current', name: 'Current' },
      { key: 'target', name: 'Target' },
    ],
    title: 'Team skills',
    description: 'Self-assessed, out of 100',
    height: 380,
  },
};
export default meta;
type Story = StoryObj<RadarChartProps>;

export const CurrentAgainstTarget: Story = {};

export const OneSeries: Story = {
  args: { series: [{ key: 'current', name: 'Current' }], fillOpacity: 0.35 },
};

export const FixedScale: Story = {
  args: { max: 100, levels: 5 },
};

export const Outlines: Story = {
  args: { fillOpacity: 0.04, dots: false, strokeWidth: 2.5 },
};

export const ManyAxes: Story = {
  args: {
    data: Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
        i
      ],
      thisYear: 40 + ((i * 37) % 55),
      lastYear: 35 + ((i * 53) % 50),
    })),
    axisKey: 'month',
    series: [
      { key: 'thisYear', name: 'This year' },
      { key: 'lastYear', name: 'Last year' },
    ],
    title: 'Sales by month',
    description: undefined,
  },
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
