import type { Meta, StoryObj } from '@storybook/react';
import { weeklyTrend } from '../../stories/data';
import { StatCard, type StatCardProps } from './StatCard';

const DollarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const meta: Meta<StatCardProps> = {
  title: 'Charts/StatCard',
  component: StatCard,
  parameters: { layout: 'padded' },
  argTypes: {
    positiveIsGood: { control: 'boolean' },
    sparklineType: { control: 'inline-radio', options: ['line', 'area', 'bar'] },
    variant: { control: 'inline-radio', options: ['outlined', 'elevated', 'filled'] },
    loading: { control: 'boolean' },
    icon: { control: false },
    sparkline: { control: false },
  },
  args: {
    title: 'Revenue',
    value: 128430,
    valueFormat: '$,.0f',
    delta: 0.124,
    deltaLabel: 'vs last month',
    sparkline: weeklyTrend,
    icon: <DollarIcon />,
  },
  decorators: [
    // One card is narrow; the row of cards brings its own width.
    (Story, context) =>
      context.id.endsWith('--dashboard') ? (
        <Story />
      ) : (
        <div style={{ maxWidth: '20rem' }}>
          <Story />
        </div>
      ),
  ],
};
export default meta;
type Story = StoryObj<StatCardProps>;

export const Playground: Story = {};

export const Down: Story = {
  args: { delta: -0.082, sparkline: [...weeklyTrend].reverse() },
};

export const IncreaseIsBad: Story = {
  name: 'An increase that is bad news (churn)',
  args: {
    title: 'Churn',
    value: 0.034,
    valueFormat: '.1%',
    delta: 0.006,
    deltaFormat: '+.1%',
    deltaLabel: 'vs last month',
    positiveIsGood: false,
    icon: undefined,
  },
};

export const NoChange: Story = { args: { delta: 0, sparkline: undefined } };

export const WithDescription: Story = {
  args: { description: 'Includes refunds and credits.', sparklineType: 'bar' },
};

export const AbsoluteChange: Story = {
  args: {
    title: 'Active users',
    value: 18240,
    valueFormat: ',.0f',
    delta: 840,
    deltaFormat: '+,.0f',
    deltaLabel: 'this week',
    icon: undefined,
  },
};

export const Elevated: Story = { args: { variant: 'elevated' } };

export const Loading: Story = { args: { loading: true } };

export const Dashboard: Story = {
  name: 'A row of cards',
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
        gap: 'var(--axon-space-4)',
      }}
    >
      <StatCard
        title="Revenue"
        value={128430}
        valueFormat="$,.0f"
        delta={0.124}
        deltaLabel="vs last month"
        sparkline={weeklyTrend}
      />
      <StatCard
        title="Orders"
        value={2310}
        valueFormat=",.0f"
        delta={0.031}
        deltaLabel="vs last month"
        sparkline={weeklyTrend.map((v) => v * 2)}
        sparklineType="bar"
      />
      <StatCard
        title="Refund rate"
        value={0.021}
        valueFormat=".1%"
        delta={0.004}
        positiveIsGood={false}
        deltaLabel="vs last month"
        sparkline={[...weeklyTrend].reverse()}
      />
      <StatCard
        title="Support tickets"
        value={87}
        delta={-0.15}
        deltaLabel="vs last month"
        sparkline={[...weeklyTrend].reverse()}
      />
    </div>
  ),
};
