import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ColorPicker, type ColorPickerProps } from './ColorPicker';

const meta = {
  title: 'Core/ColorPicker',
  component: ColorPicker,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    allowCustom: { control: 'boolean' },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    swatches: { control: false },
    onChange: { action: 'changed' },
  },
  args: { label: 'Brand color', helperText: 'Pick a swatch or type a hex value.' },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithValue: Story = { args: { defaultValue: '#3b82f6' } };

export const CustomSwatches: Story = {
  args: {
    label: 'Label color',
    swatches: [
      { value: '#fde68a', label: 'Sand' },
      { value: '#86efac', label: 'Mint' },
      { value: '#7dd3fc', label: 'Sky' },
      { value: '#c4b5fd', label: 'Lavender' },
      { value: '#fca5a5', label: 'Rose' },
      { value: '#111827', label: 'Ink' },
    ],
    defaultValue: '#86efac',
  },
};

export const HexOnly: Story = { args: { swatches: [], allowCustom: false, label: 'Hex color' } };

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-6)' }}>
      <ColorPicker {...args} label="Required" required helperText={undefined} />
      <ColorPicker {...args} label="Error" error errorMessage="Choose a color" />
      <ColorPicker {...args} label="Disabled" disabled defaultValue="#ef4444" />
    </div>
  ),
};

function ControlledDemo(args: ColorPickerProps) {
  const [value, setValue] = useState<string | null>('#8b5cf6');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-3)' }}>
      <ColorPicker {...args} value={value} onChange={setValue} />
      <div
        style={{
          width: '6rem',
          height: '2rem',
          borderRadius: 'var(--axon-radius-md)',
          border: '1px solid var(--axon-color-border-strong)',
          background: value ?? 'transparent',
        }}
        aria-hidden="true"
      />
      <code>value = {JSON.stringify(value)}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
