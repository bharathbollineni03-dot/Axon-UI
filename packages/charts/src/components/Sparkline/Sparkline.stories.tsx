import type { Meta, StoryObj } from '@storybook/react';
import { weeklyTrend } from '../../stories/data';
import { Sparkline, type SparklineProps } from './Sparkline';

const meta: Meta<SparklineProps> = {
  title: 'Charts/Sparkline',
  component: Sparkline,
  parameters: { layout: 'padded' },
  argTypes: {
    type: { control: 'inline-radio', options: ['line', 'area', 'bar'] },
    curve: { control: 'select', options: ['linear', 'monotone', 'natural', 'step'] },
    width: { control: { type: 'number', min: 40, max: 400, step: 4 } },
    height: { control: { type: 'number', min: 16, max: 120, step: 2 } },
    showLast: { control: 'boolean' },
    showExtremes: { control: 'boolean' },
    decorative: { control: 'boolean' },
    data: { control: false },
  },
  args: { data: weeklyTrend },
};
export default meta;
type Story = StoryObj<SparklineProps>;

export const Playground: Story = {};

export const Area: Story = { args: { type: 'area' } };

export const Bars: Story = { args: { type: 'bar' } };

export const WithExtremes: Story = { args: { showExtremes: true, width: 160, height: 40 } };

export const Large: Story = { args: { width: 320, height: 80, type: 'area', showExtremes: true } };

export const WithGaps: Story = {
  args: { data: [4, 6, null, null, 9, 8, 12], curve: 'linear', width: 140 },
};

export const InText: Story = {
  name: 'Inline, in a sentence and a table',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--axon-space-4)', maxWidth: '32rem' }}>
      <p style={{ margin: 0 }}>
        Sign-ups are up <Sparkline data={weeklyTrend} width={72} height={20} /> this quarter.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'start' }}>Plan</th>
            <th style={{ textAlign: 'end' }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Free', weeklyTrend],
            ['Pro', [...weeklyTrend].reverse()],
            ['Team', weeklyTrend.map((v, i) => v + i * 3)],
          ].map(([name, values]) => (
            <tr key={String(name)}>
              <td>{String(name)}</td>
              <td style={{ textAlign: 'end' }}>
                <Sparkline
                  data={values as number[]}
                  type="area"
                  ariaLabel={`${String(name)} plan trend`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};

export const Colours: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--axon-space-4)' }}>
      {[
        'var(--axon-chart-1)',
        'var(--axon-color-success-solid)',
        'var(--axon-color-danger-solid)',
        'tomato',
      ].map((color) => (
        <Sparkline key={color} data={weeklyTrend} color={color} type="area" width={80} />
      ))}
    </div>
  ),
};
