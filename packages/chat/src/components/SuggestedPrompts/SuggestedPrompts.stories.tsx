import type { Meta, StoryObj } from '@storybook/react';
import { SparklesIcon } from '../../internal/icons';
import { SuggestedPrompts } from './SuggestedPrompts';

const meta = {
  title: 'Chat/SuggestedPrompts',
  component: SuggestedPrompts,
  parameters: { layout: 'padded' },
  argTypes: {
    layout: { control: 'inline-radio', options: ['cards', 'chips'] },
    columns: { control: 'inline-radio', options: [1, 2, 3] },
    disabled: { control: 'boolean' },
    onSelect: { control: false },
  },
  args: {
    title: 'Try asking',
    onSelect: () => {},
    prompts: [
      { title: 'Summarize this article', description: 'Get the key points in three bullets' },
      { title: 'Draft a polite follow-up email', description: 'After a meeting that ran long' },
      { title: 'Explain recursion', description: 'With a small example' },
      { title: 'Plan a weekend in Lisbon', description: 'Food, walks and one museum' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '44rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SuggestedPrompts>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {};

export const Chips: Story = { args: { layout: 'chips' } };

export const ThreeColumns: Story = { args: { columns: 3 } };

export const WithIcons: Story = {
  args: {
    prompts: [
      { title: 'Brainstorm ideas', icon: <SparklesIcon />, description: 'For a side project' },
      { title: 'Review my code', icon: <SparklesIcon />, description: 'Paste it below' },
    ],
  },
};

export const Disabled: Story = { args: { disabled: true } };
