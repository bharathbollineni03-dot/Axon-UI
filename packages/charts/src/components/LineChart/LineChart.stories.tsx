import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { dailyTraffic, monthlyFinance, seeded } from '../../stories/data';
import { LineChart, type LineChartProps } from './LineChart';

const meta: Meta<LineChartProps> = {
  title: 'Charts/LineChart',
  component: LineChart,
  parameters: { layout: 'padded' },
  argTypes: {
    curve: {
      control: 'select',
      options: [
        'linear',
        'monotone',
        'natural',
        'step',
        'stepBefore',
        'stepAfter',
        'basis',
        'cardinal',
        'catmullRom',
      ],
    },
    dots: { control: 'inline-radio', options: ['auto', true, false] },
    legend: { control: 'inline-radio', options: [true, false, 'top', 'bottom'] },
    dataTable: { control: 'inline-radio', options: ['auto', true, false] },
    height: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    connectNulls: { control: 'boolean' },
    includeZero: { control: 'boolean' },
    animate: { control: 'boolean' },
    tooltip: { control: 'boolean' },
    loading: { control: 'boolean' },
    data: { control: false },
    series: { control: false },
  },
  args: {
    data: monthlyFinance,
    xKey: 'month',
    series: [
      { key: 'revenue', name: 'Revenue' },
      { key: 'costs', name: 'Costs' },
    ],
    title: 'Revenue and costs',
    description: 'Per month, in thousands of dollars',
    height: 320,
    valueFormat: '$,.0f',
  },
};
export default meta;
type Story = StoryObj<LineChartProps>;

export const Playground: Story = {};

export const Smooth: Story = { args: { curve: 'monotone' } };

export const Steps: Story = {
  name: 'Steps (values that hold until the next)',
  args: { curve: 'stepAfter', dots: false },
};

export const AxisTitlesAndFormats: Story = {
  args: {
    xAxis: { label: 'Month' },
    yAxis: { label: 'Thousands of dollars', tickFormat: '$,.0f' },
    series: [{ key: 'revenue', name: 'Revenue' }],
  },
};

export const ThreeSeries: Story = {
  args: {
    series: [
      { key: 'revenue', name: 'Revenue' },
      { key: 'costs', name: 'Costs' },
      { key: 'profit', name: 'Profit' },
    ],
    curve: 'monotone',
  },
};

export const OverTime: Story = {
  name: 'A date axis (90 days)',
  args: {
    data: dailyTraffic(),
    xKey: 'date',
    series: [{ key: 'visitors', name: 'Visitors' }],
    title: 'Daily visitors',
    description: 'The last 90 days. Weekends dip.',
    valueFormat: ',.0f',
    curve: 'monotone',
    dots: false,
    includeZero: true,
  },
};

export const TwoLinesDifferentScales: Story = {
  name: 'Visitors and sign-ups (see the Combo chart for two axes)',
  args: {
    data: dailyTraffic(30),
    xKey: 'date',
    series: [
      { key: 'visitors', name: 'Visitors' },
      { key: 'signups', name: 'Sign-ups' },
    ],
    dots: false,
  },
};

export const WithGaps: Story = {
  name: 'Missing values leave a gap',
  args: {
    data: monthlyFinance.map((row, index) => ({
      ...row,
      costs: index === 4 || index === 5 ? null : row.costs,
    })),
  },
};

export const GapsConnected: Story = {
  args: {
    data: monthlyFinance.map((row, index) => ({
      ...row,
      costs: index === 4 || index === 5 ? null : row.costs,
    })),
    connectNulls: true,
  },
};

export const NegativeValues: Story = {
  args: {
    series: [{ key: 'profit', name: 'Profit' }],
    data: monthlyFinance.map((row, index) => ({ ...row, profit: row.profit - 70 + index })),
    title: 'Profit against plan',
  },
};

const noisy = (() => {
  const random = seeded(11);
  let value = 50;
  return Array.from({ length: 1000 }, (_, index) => {
    value += (random() - 0.5) * 6;
    return { step: index, value: Math.round(value * 10) / 10 };
  });
})();

export const ThousandPoints: Story = {
  name: '1,000 points',
  args: {
    data: noisy,
    xKey: 'step',
    series: [{ key: 'value', name: 'Value' }],
    title: 'A random walk',
    valueFormat: '.1f',
    dots: false,
    animate: false,
  },
};

export const Narrow: Story = {
  name: 'In a narrow container',
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const LegendOnTop: Story = { args: { legend: 'top' } };

export const NoLegendNoTooltip: Story = { args: { legend: false, tooltip: false } };

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };

export const CustomEmptyState: Story = {
  args: {
    data: [],
    emptyState: (
      <div style={{ padding: 'var(--axon-space-6)' }}>
        <strong>No revenue yet.</strong>
        <p style={{ margin: 0 }}>Come back after your first sale.</p>
      </div>
    ),
  },
};

function ControlledLegend(args: LineChartProps) {
  const [hidden, setHidden] = useState<string[]>(['costs']);
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <LineChart {...args} hiddenSeries={hidden} onHiddenSeriesChange={setHidden} />
      <p style={{ margin: 0, color: 'var(--axon-color-text-secondary)' }}>
        Hidden: <code>{JSON.stringify(hidden)}</code>
      </p>
    </div>
  );
}

export const ControlledSeries: Story = {
  name: 'Hidden series kept in your own state',
  render: (args) => <ControlledLegend {...args} />,
};

function ClickDemo(args: LineChartProps) {
  const [picked, setPicked] = useState(
    'Move over the chart and click, or focus it and use the arrow keys and Enter.',
  );
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <LineChart
        {...args}
        onPointClick={(datum) =>
          setPicked(`You chose ${String(datum['month'])}: $${String(datum['revenue'])}k revenue.`)
        }
      />
      <p aria-live="polite" style={{ margin: 0 }}>
        {picked}
      </p>
    </div>
  );
}

export const ClickAPoint: Story = {
  name: 'Click or press Enter on a point',
  render: (args) => <ClickDemo {...args} />,
};
