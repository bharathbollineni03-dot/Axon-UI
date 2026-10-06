import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextArea, type TextAreaProps } from './TextArea';

const meta = {
  title: 'Core/TextArea',
  component: TextArea,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
    },
    error: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    autoResize: { control: 'boolean' },
    showCount: { control: 'boolean' },
    minRows: { control: 'number' },
    maxRows: { control: 'number' },
    fullWidth: { control: 'boolean' },
  },
  args: { label: 'Message', placeholder: 'Write something…', fullWidth: true },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(100%, 26rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AutoResize: Story = {
  args: {
    autoResize: true,
    minRows: 2,
    maxRows: 6,
    helperText: 'Grows from 2 to 6 rows, then scrolls.',
  },
};

export const CharacterCount: Story = {
  args: { showCount: true, maxLength: 140, helperText: 'Keep it short.' },
};

function StatesDemo(args: TextAreaProps) {
  const [value, setValue] = useState('Too short');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      <TextArea
        {...args}
        label="With error"
        error
        errorMessage="Write at least 20 characters"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <TextArea {...args} label="Disabled" disabled defaultValue="Can't edit" />
      <TextArea {...args} label="Read only" readOnly defaultValue="Read only value" />
      <TextArea {...args} label="Filled" variant="filled" />
    </div>
  );
}

export const States: Story = {
  render: (args) => <StatesDemo {...args} />,
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--axon-space-4)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <TextArea key={size} {...args} label={size} size={size} minRows={2} />
      ))}
    </div>
  ),
};
