import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DateRangePicker, type DateRange, type DateRangePickerProps } from './DateRangePicker';

const meta = {
  title: 'Core/DateRangePicker',
  component: DateRangePicker,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    locale: { control: 'select', options: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP'] },
    clearable: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    isDateDisabled: { control: false },
    onChange: { action: 'changed' },
  },
  args: { label: 'Stay', helperText: 'Pick a start and an end date.' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 26rem)', minHeight: '28rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { fullWidth: true, clearable: true } };

export const WithValue: Story = {
  args: {
    defaultValue: { start: new Date(2026, 9, 10), end: new Date(2026, 9, 20) },
    fullWidth: true,
  },
};

export const MinAndMax: Story = {
  args: {
    min: new Date(2026, 9, 5),
    max: new Date(2026, 10, 25),
    helperText: 'Bookings from 5 Oct to 25 Nov 2026.',
    fullWidth: true,
  },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <DateRangePicker {...args} label="Required" required fullWidth />
      <DateRangePicker {...args} label="Error" error errorMessage="Choose dates" fullWidth />
      <DateRangePicker
        {...args}
        label="Disabled"
        disabled
        defaultValue={{ start: new Date(2026, 9, 10), end: new Date(2026, 9, 20) }}
        fullWidth
      />
    </div>
  ),
};

function ControlledDemo(args: DateRangePickerProps) {
  const [value, setValue] = useState<DateRange>({ start: null, end: null });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <DateRangePicker {...args} value={value} onChange={setValue} fullWidth />
      <code>
        {value.start?.toDateString() ?? '—'} → {value.end?.toDateString() ?? '—'}
      </code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
