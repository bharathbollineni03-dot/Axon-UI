import type { Meta, StoryObj } from '@storybook/react';
import { weeklyActivity, yearOfActivity } from '../../stories/data';
import { Heatmap, type HeatmapProps } from './Heatmap';

const meta: Meta<HeatmapProps> = {
  title: 'Charts/Heatmap',
  component: Heatmap,
  parameters: { layout: 'padded' },
  argTypes: {
    steps: { control: { type: 'number', min: 2, max: 10 } },
    showValues: { control: 'boolean' },
    scale: { control: 'boolean' },
    cellRadius: { control: { type: 'number', min: 0, max: 12 } },
    cellGap: { control: { type: 'number', min: 0, max: 10 } },
    height: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    loading: { control: 'boolean' },
    data: { control: false },
  },
  args: {
    data: weeklyActivity,
    xKey: 'hour',
    yKey: 'day',
    valueKey: 'merged',
    title: 'Pull requests merged',
    description: 'By weekday and time of day',
    height: 260,
    showValues: true,
  },
};
export default meta;
type Story = StoryObj<HeatmapProps>;

export const Categories: Story = {};

export const WithoutNumbers: Story = { args: { showValues: false, cellRadius: 6, cellGap: 4 } };

export const OtherColour: Story = {
  args: { color: 'var(--axon-chart-3)', steps: 7 },
};

export const FixedScale: Story = {
  name: 'A fixed scale (0 to 30)',
  args: { domain: [0, 30] },
};

export const Calendar: Story = {
  name: 'Calendar (a year of activity)',
  args: {
    calendar: true,
    data: yearOfActivity(2024),
    dateKey: 'date',
    valueKey: 'count',
    title: 'Contributions in 2024',
    description: undefined,
    showValues: false,
    locale: 'en-US',
    color: 'var(--axon-chart-3)',
    dataTable: false,
  },
};

export const CalendarWeekStartsMonday: Story = {
  args: {
    calendar: true,
    data: yearOfActivity(2024).slice(0, 140),
    dateKey: 'date',
    valueKey: 'count',
    weekStartsOn: 1,
    title: 'First 20 weeks of 2024',
    description: undefined,
    locale: 'en-GB',
    dataTable: false,
  },
};

export const LargeCells: Story = {
  args: {
    calendar: true,
    data: yearOfActivity(2024).slice(0, 90),
    dateKey: 'date',
    valueKey: 'count',
    cellSize: 22,
    cellGap: 4,
    cellRadius: 5,
    title: 'First quarter',
    description: undefined,
    dataTable: false,
  },
};

export const Loading: Story = { args: { loading: true } };

export const Empty: Story = { args: { data: [] } };
