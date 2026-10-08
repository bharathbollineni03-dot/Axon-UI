import type { Meta, StoryObj } from '@storybook/react';
import { monthlyFinance } from '../../stories/data';
import { ComboChart, type ComboChartProps } from './ComboChart';

const funnel = monthlyFinance.map((row, index) => ({
  month: row.month,
  revenue: row.revenue,
  costs: row.costs,
  margin: (row.revenue - row.costs) / row.revenue,
  target: 0.3 + index * 0.004,
}));

const meta: Meta<ComboChartProps> = {
  title: 'Charts/ComboChart',
  component: ComboChart,
  parameters: { layout: 'padded' },
  argTypes: {
    stackedBars: { control: 'boolean' },
    curve: {
      control: 'select',
      options: ['linear', 'monotone', 'natural', 'step', 'stepAfter'],
    },
    height: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
    series: { control: false },
  },
  args: {
    data: funnel,
    xKey: 'month',
    series: [
      { key: 'revenue', name: 'Revenue', type: 'bar', format: '$,.0f' },
      { key: 'costs', name: 'Costs', type: 'bar', format: '$,.0f' },
      { key: 'margin', name: 'Margin', type: 'line', axis: 'right', format: '.1%' },
    ],
    title: 'Revenue, costs and margin',
    description: 'Dollars in thousands on the left, margin on the right',
    height: 340,
    yAxis: { tickFormat: '$,.0f', label: 'Thousands' },
    y2Axis: { tickFormat: '.0%', label: 'Margin' },
    curve: 'monotone',
  },
};
export default meta;
type Story = StoryObj<ComboChartProps>;

export const BarsAndALineOnTwoAxes: Story = {};

export const StackedBars: Story = { args: { stackedBars: true } };

export const WithATarget: Story = {
  name: 'A line for the target',
  args: {
    series: [
      { key: 'margin', name: 'Margin', type: 'bar', format: '.1%' },
      { key: 'target', name: 'Target', type: 'line', format: '.1%' },
    ],
    yAxis: { tickFormat: '.0%' },
    y2Axis: undefined,
    title: 'Margin against target',
    description: undefined,
  },
};

export const AreaAndLine: Story = {
  args: {
    series: [
      { key: 'revenue', name: 'Revenue', type: 'area', format: '$,.0f' },
      { key: 'margin', name: 'Margin', type: 'line', axis: 'right', format: '.1%' },
    ],
  },
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
