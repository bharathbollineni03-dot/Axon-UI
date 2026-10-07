import type { Meta, StoryObj } from '@storybook/react';
import { monthlyFinance, quarterlySales } from '../../stories/data';
import { BarChart, type BarChartProps } from './BarChart';

const regions = [
  { key: 'north', name: 'North' },
  { key: 'south', name: 'South' },
  { key: 'east', name: 'East' },
  { key: 'west', name: 'West' },
];

const meta: Meta<BarChartProps> = {
  title: 'Charts/BarChart',
  component: BarChart,
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    stacked: { control: 'inline-radio', options: [false, true, 'percent'] },
    barRadius: { control: { type: 'number', min: 0, max: 16 } },
    barPadding: { control: { type: 'range', min: 0, max: 0.8, step: 0.05 } },
    groupPadding: { control: { type: 'range', min: 0, max: 0.8, step: 0.05 } },
    maxBarSize: { control: { type: 'number', min: 4, max: 80 } },
    showValues: { control: 'boolean' },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    height: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
    series: { control: false },
  },
  args: {
    data: quarterlySales,
    xKey: 'quarter',
    series: regions,
    title: 'Sales by region',
    description: 'Per quarter, in thousands of dollars',
    height: 320,
    valueFormat: '$,.0f',
  },
};
export default meta;
type Story = StoryObj<BarChartProps>;

export const Grouped: Story = {};

export const Stacked: Story = { args: { stacked: true } };

export const PercentStacked: Story = {
  name: '100% stacked (shares)',
  args: { stacked: 'percent' },
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal', height: 360 },
};

export const HorizontalStacked: Story = {
  args: { orientation: 'horizontal', stacked: true, height: 360 },
};

export const SingleSeriesWithValues: Story = {
  name: 'One series, values on the bars',
  args: {
    data: monthlyFinance,
    xKey: 'month',
    series: [{ key: 'revenue', name: 'Revenue' }],
    title: 'Monthly revenue',
    showValues: true,
    maxBarSize: 36,
    valueFormat: ',.0f',
  },
};

export const PositiveAndNegative: Story = {
  args: {
    data: monthlyFinance.map((row, index) => ({
      ...row,
      profit: row.profit - 45 + (index % 3) * 6,
    })),
    xKey: 'month',
    series: [{ key: 'profit', name: 'Profit against plan' }],
    title: 'Profit against plan',
    showValues: true,
    valueFormat: '+,.0f',
    legend: false,
  },
};

export const ManyCategories: Story = {
  name: 'Many categories',
  args: {
    data: Array.from({ length: 40 }, (_, index) => ({
      week: `W${index + 1}`,
      value: Math.round(60 + Math.sin(index / 3) * 30 + index),
    })),
    xKey: 'week',
    series: [{ key: 'value', name: 'Orders' }],
    title: 'Orders per week',
    barRadius: 2,
    legend: false,
    valueFormat: ',.0f',
  },
};

export const Square: Story = { args: { barRadius: 0 } };

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
