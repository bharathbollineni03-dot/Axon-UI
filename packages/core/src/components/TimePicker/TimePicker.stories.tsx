import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimePicker, type TimePickerProps } from './TimePicker';

const meta = {
  title: 'Core/TimePicker',
  component: TimePicker,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    hourCycle: { control: 'inline-radio', options: [undefined, 12, 24] },
    locale: { control: 'select', options: ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP'] },
    minuteStep: { control: 'number' },
    clearable: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    onChange: { action: 'changed' },
  },
  args: { label: 'Start time', helperText: 'Type "3pm" or "15:30", or open the picker.' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 18rem)', minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { fullWidth: true, clearable: true } };

export const WithValue: Story = { args: { defaultValue: '15:30', fullWidth: true } };

export const TwentyFourHour: Story = {
  args: { hourCycle: 24, defaultValue: '15:30', label: '24-hour clock', fullWidth: true },
};

export const BusinessHours: Story = {
  args: {
    label: 'Appointment',
    min: '09:00',
    max: '17:30',
    minuteStep: 15,
    defaultValue: '10:30',
    helperText: 'Between 09:00 and 17:30, every 15 minutes.',
    fullWidth: true,
  },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <TimePicker {...args} label="Required" required fullWidth />
      <TimePicker {...args} label="Error" error errorMessage="Choose a time" fullWidth />
      <TimePicker {...args} label="Disabled" disabled defaultValue="09:00" fullWidth />
    </div>
  ),
};

function ControlledDemo(args: TimePickerProps) {
  const [value, setValue] = useState<string | null>('08:45');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <TimePicker {...args} value={value} onChange={setValue} fullWidth />
      <button type="button" onClick={() => setValue('18:00')}>
        Set to 18:00
      </button>
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
