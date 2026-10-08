import type { Meta, StoryObj } from '@storybook/react';
import { dailyTraffic } from '../../stories/data';
import { AreaChart, type AreaChartProps } from './AreaChart';

const traffic = dailyTraffic(60).map(({ date, visitors, signups }) => ({
  date,
  organic: Math.round(visitors * 0.5),
  paid: Math.round(visitors * 0.3),
  referral: Math.round(visitors * 0.2),
  signups,
}));

const meta: Meta<AreaChartProps> = {
  title: 'Charts/AreaChart',
  component: AreaChart,
  parameters: { layout: 'padded' },
  argTypes: {
    stacked: { control: 'inline-radio', options: [false, true, 'percent'] },
    curve: {
      control: 'select',
      options: ['linear', 'monotone', 'natural', 'step', 'stepAfter', 'basis', 'catmullRom'],
    },
    outline: { control: 'boolean' },
    fillOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    height: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
    series: { control: false },
  },
  args: {
    data: traffic,
    xKey: 'date',
    series: [
      { key: 'organic', name: 'Organic' },
      { key: 'paid', name: 'Paid' },
      { key: 'referral', name: 'Referral' },
    ],
    title: 'Visitors by source',
    description: 'The last 60 days',
    height: 320,
    valueFormat: ',.0f',
    curve: 'monotone',
  },
};
export default meta;
type Story = StoryObj<AreaChartProps>;

export const Overlapping: Story = {};

export const Stacked: Story = { args: { stacked: true } };

export const PercentStacked: Story = {
  name: '100% stacked (shares)',
  args: { stacked: 'percent', description: 'Share of visitors by source' },
};

export const SingleSeries: Story = {
  args: {
    series: [{ key: 'signups', name: 'Sign-ups' }],
    title: 'Sign-ups',
    description: undefined,
    fillOpacity: 0.3,
  },
};

export const NoOutline: Story = { args: { outline: false, stacked: true } };

export const Steps: Story = { args: { curve: 'stepAfter', stacked: true } };

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
