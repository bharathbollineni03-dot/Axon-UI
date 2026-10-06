import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker, type DatePickerProps } from './DatePicker';

const meta = {
  title: 'Core/DatePicker',
  component: DatePicker,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    locale: { control: 'select', options: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'es-ES'] },
    firstDayOfWeek: { control: 'inline-radio', options: [undefined, 0, 1, 6] },
    clearable: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    min: { control: 'date' },
    max: { control: 'date' },
    isDateDisabled: { control: false },
    onChange: { action: 'changed' },
  },
  args: { label: 'Date of birth', helperText: 'Type a date or open the calendar.' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 20rem)', minHeight: '26rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { fullWidth: true, clearable: true } };

export const WithValue: Story = { args: { defaultValue: new Date(2026, 9, 15), fullWidth: true } };

export const Locales: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      {(['en-US', 'en-GB', 'de-DE', 'ja-JP'] as const).map((locale) => (
        <DatePicker
          key={locale}
          {...args}
          locale={locale}
          label={locale}
          helperText={undefined}
          defaultValue={new Date(2026, 9, 5)}
          fullWidth
        />
      ))}
    </div>
  ),
};

export const MinAndMax: Story = {
  args: {
    label: 'Appointment',
    defaultValue: new Date(2026, 9, 15),
    min: new Date(2026, 9, 10),
    max: new Date(2026, 9, 24),
    helperText: 'Only 10–24 October can be chosen.',
    fullWidth: true,
  },
};

export const WeekdaysOnly: Story = {
  args: {
    label: 'Delivery date',
    isDateDisabled: (date) => date.getDay() === 0 || date.getDay() === 6,
    helperText: 'Weekends are unavailable.',
    fullWidth: true,
  },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <DatePicker {...args} label="Required" required fullWidth />
      <DatePicker {...args} label="Error" error errorMessage="Choose a date" fullWidth />
      <DatePicker
        {...args}
        label="Disabled"
        disabled
        defaultValue={new Date(2026, 9, 15)}
        fullWidth
      />
      <DatePicker
        {...args}
        label="Read only"
        readOnly
        defaultValue={new Date(2026, 9, 15)}
        fullWidth
      />
    </div>
  ),
};

function ControlledDemo(args: DatePickerProps) {
  const [value, setValue] = useState<Date | null>(new Date(2026, 9, 15));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <DatePicker {...args} value={value} onChange={setValue} fullWidth />
      <button type="button" onClick={() => setValue(new Date(2027, 0, 1))}>
        Set to 1 January 2027
      </button>
      <code>{value ? value.toDateString() : 'null'}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
