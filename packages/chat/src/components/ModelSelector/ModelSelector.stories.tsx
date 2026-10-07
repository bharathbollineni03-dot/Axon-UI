import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelector, type ChatModel, type ModelSelectorProps } from './ModelSelector';

const models: ChatModel[] = [
  {
    id: 'axon-fast',
    name: 'Axon Fast',
    description: 'Quick answers for everyday questions',
    badge: 'New',
  },
  {
    id: 'axon-smart',
    name: 'Axon Smart',
    description: 'Best for hard problems, code and long documents',
  },
  { id: 'axon-mini', name: 'Axon Mini', description: 'Smallest and cheapest' },
  {
    id: 'axon-classic',
    name: 'Axon Classic',
    description: 'Retired on 1 March',
    badge: 'Legacy',
    disabled: true,
  },
];

const meta: Meta<ModelSelectorProps> = {
  title: 'Chat/ModelSelector',
  component: ModelSelector,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    models: { control: false },
  },
  args: { models, defaultValue: 'axon-fast' },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<ModelSelectorProps>;

export const Playground: Story = {};

export const NothingChosen: Story = { args: { defaultValue: undefined } };

export const Grouped: Story = {
  args: {
    defaultValue: 'sonnet',
    models: [
      { id: 'haiku', name: 'Haiku', description: 'Fastest', group: 'Anthropic' },
      { id: 'sonnet', name: 'Sonnet', description: 'Balanced', group: 'Anthropic' },
      { id: 'local-small', name: 'Local 7B', description: 'Runs on your machine', group: 'Local' },
    ],
  },
};

export const Disabled: Story = { args: { disabled: true } };

function ControlledDemo(props: ModelSelectorProps) {
  const [value, setValue] = useState('axon-smart');
  return (
    <div style={{ display: 'grid', gap: 'var(--axon-space-3)' }}>
      <ModelSelector {...props} value={value} onChange={setValue} />
      <p style={{ margin: 0, color: 'var(--axon-color-text-secondary)' }}>
        Chosen id: <code>{value}</code>
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledDemo {...args} />,
};
