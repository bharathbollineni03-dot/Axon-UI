import type { Meta, StoryObj } from '@storybook/react';
import { ToolCallCard } from './ToolCallCard';

const meta = {
  title: 'Chat/ToolCallCard',
  component: ToolCallCard,
  parameters: { layout: 'padded' },
  argTypes: {
    status: {
      control: 'inline-radio',
      options: [undefined, 'pending', 'running', 'success', 'error'],
    },
    isError: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
  },
  args: {
    name: 'get_weather',
    arguments: { city: 'Paris', units: 'metric' },
    result: { temperature: 21, condition: 'Partly cloudy' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '36rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToolCallCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Running: Story = { args: { status: 'running', result: undefined } };

export const Failed: Story = {
  args: { result: 'Error: city not found', isError: true, defaultOpen: true },
};

export const ArgumentsOnly: Story = { args: { result: undefined } };

export const NoDetails: Story = { args: { arguments: undefined, result: undefined } };

export const TextResult: Story = {
  args: {
    name: 'read_file',
    arguments: { path: 'README.md' },
    result: '# Axon UI\n\nA React component library.',
    defaultOpen: true,
  },
};
